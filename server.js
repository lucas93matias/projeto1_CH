const express = require('express');
const connectDB = require('./dao/db');
const { v4: uuidv4 } = require('uuid');
const Product = require('./dao/models/Product'); // Verifique o caminho e o nome do arquivo
const Cart = require('./dao/models/cart');
const Message = require('./dao/models/message');
const http = require('http');
const socketIo = require('socket.io');

connectDB();

const app = express();
const server = http.createServer(app); // Alterar para usar http.createServer
const io = socketIo(server); // Adicionar socket.io
const PORT = 3000;

app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

io.on('connection', (socket) => {
  console.log('Novo cliente conectado');

  socket.on('message', async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();
    io.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

app.get('/chat', (req, res) => {
  res.render('chat');
});

const productsRouter = express.Router();

productsRouter.get('/', async (req, res) => {
  try {
    let { limit } = req.query;
    limit = limit ? parseInt(limit) : undefined;

    const products = await Product.find().limit(limit);
    res.json(products);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

productsRouter.get('/:pid', async (req, res) => {
  const { pid } = req.params;
  try {
    const product = await Product.findById(pid);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto com ID:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

productsRouter.post('/', async (req, res) => {
  const {
    title,
    description,
    code,
    price,
    stock,
    thumbnails,
  } = req.body;

  if (!title || !description || !code || !price || !stock) {
    return res.status(400).json({ error: 'Todos os campos exceto thumbails são obrigatórios' });
  }

  try {
    const newProduct = new Product({
      title,
      description,
      code,
      price,
      status: true,
      stock,
      thumbnails: thumbnails || [],
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Erro ao adicionar o produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

productsRouter.put('/:pid', async (req, res) => {
  const { pid } = req.params;
  const updates = req.body;

  try {
    const updatedProduct = await Product.findByIdAndUpdate(pid, updates, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Erro ao atualizar o produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

productsRouter.delete('/:pid', async (req, res) => {
  const { pid } = req.params;

  try {
    const deletedProduct = await Product.findByIdAndDelete(pid);

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.send('Produto deletado');
  } catch (error) {
    console.error('Erro ao deletar o produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.use('/api/products', productsRouter);

const cartsRouter = express.Router();

cartsRouter.post('/', async (req, res) => {
  try {
    const newCart = new Cart({
      userId: uuidv4(), // Atualize isso conforme necessário
      products: [],
    });

    const savedCart = await newCart.save();
    res.status(201).json(savedCart);
  } catch (error) {
    console.error('Erro ao criar novo carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

cartsRouter.get('/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    const cart = await Cart.findById(cid).populate('products.productId');

    if (!cart) {
      return res.status(404).json({ error: 'Carrinho não encontrado' });
    }

    res.json(cart.products);
  } catch (error) {
    console.error('Erro ao buscar produtos do carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

cartsRouter.post('/:cid/product/:pid', async (req, res) => {
  const { cid, pid } = req.params;
  const { quantidade } = req.body;

  if (!quantidade || isNaN(parseInt(quantidade))) {
    return res.status(400).json({ error: 'A quantidade do produto é obrigatória e deve ser um número' });
  }

  try {
    const cart = await Cart.findById(cid);

    if (!cart) {
      return res.status(404).json({ error: 'Carrinho não encontrado' });
    }

    const existingProductIndex = cart.products.findIndex(p => p.productId.toString() === pid);
    if (existingProductIndex !== -1) {
      cart.products[existingProductIndex].quantity += parseInt(quantidade);
    } else {
      cart.products.push({
        productId: pid,
        quantity: parseInt(quantidade),
      });
    }

    await cart.save();
    res.status(200).json({ message: 'Produto adicionado ao carrinho com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar produto ao carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.use('/api/carts', cartsRouter);

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
