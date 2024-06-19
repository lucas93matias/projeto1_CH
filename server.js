const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;
const productsFilePath = `${__dirname}/produtos.json`;
const cartsFilePath = `${__dirname}/carrinho.json`;

app.use(express.json());

async function readProductsFile() {
  try {
    const data = await fs.readFile(productsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler arquivo de produtos:', error);
    return [];
  }
}

async function writeProductsFile(products) {
  try {
    await fs.writeFile(productsFilePath, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Erro ao escrever no arquivo de produtos:', error);
  }
}

async function readCartsFile() {
  try {
    const data = await fs.readFile(cartsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler arquivo de carrinho:', error);
    return [];
  }
}

async function writeCartsFile(carts) {
  try {
    await fs.writeFile(cartsFilePath, JSON.stringify(carts, null, 2));
  } catch (error) {
    console.error('Erro ao escrever no arquivo de carrinho:', error);
  }
}

app.get('/api/products', async (req, res) => {
  try {
    let { limit } = req.query;
    limit = limit ? parseInt(limit) : undefined;

    const products = await readProductsFile();
    const limitedProducts = limit ? products.slice(0, limit) : products;

    res.json(limitedProducts);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/products/:pid', async (req, res) => {
  const { pid } = req.params;
  try {
    const products = await readProductsFile();
    const product = products.find(prod => prod.id === pid);

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    console.error('Erro ao buscar produto com ID:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/products', async (req, res) => {
  const {
    title,
    description,
    code,
    price,
    stock,
    thumbnails,
  } = req.body;

  if (!title || !description || !code || !price || !stock) {
    return res.status(400).json({ error: 'Todos os campos exceto thumbnails são obrigatórios' });
  }

  try {
    const newProduct = {
      id: uuidv4(),
      title,
      description,
      code,
      price,
      status: true,
      stock,
      thumbnails: thumbnails || [],
    };

    const products = await readProductsFile();
    products.push(newProduct);
    await writeProductsFile(products);

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Erro ao adicionar o produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/products/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const products = await readProductsFile();
    const index = products.findIndex(p => p.id === pid);

    if (index !== -1) {
      const updatedProduct = { ...products[index], ...req.body, id: pid };
      products[index] = updatedProduct;
      await writeProductsFile(products);
      res.json(updatedProduct);
    } else {
      res.status(404).send('Produto não encontrado');
    }
  } catch (error) {
    console.error('Erro ao atualizar o produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/products/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    let products = await readProductsFile();
    const productExists = products.some(p => p.id === pid);

    if (productExists) {
      products = products.filter(p => p.id !== pid);
      await writeProductsFile(products);
      res.send('Produto deletado');
    } else {
      res.status(404).send('Produto não encontrado');
    }
  } catch (error) {
    console.error('Erro ao deletar o produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/carts/', async (req, res) => {
  try {
    const newCart = {
      cartId: uuidv4(),
      products: [],
    };

    let carts = await readCartsFile();
    carts.push(newCart);
    await writeCartsFile(carts);

    res.status(201).json(newCart);
  } catch (error) {
    console.error('Erro ao criar o carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/carts', async (req, res) => {
  try {
    const carts = await readCartsFile();
    res.json(carts);
  } catch (error) {
    console.error('Erro ao listar carrinhos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/carts/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    const carts = await readCartsFile();
    const cart = carts.find(cart => cart.cartId === cid);

    if (!cart) {
      return res.status(404).json({ error: 'Carrinho não encontrado' });
    }

    res.json(cart.products);
  } catch (error) {
    console.error('Erro ao buscar carrinho com ID:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/carts/:cid/product', async (req, res) => {
  const { cid } = req.params;
  const { productId, quantity } = req.body;

  if (!productId || !quantity || typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  try {
    let carts = await readCartsFile();
    const index = carts.findIndex(cart => cart.cartId === cid);

    if (index !== -1) {
      let cart = carts[index];
      let productIndex = cart.products.findIndex(item => item.productId === productId);

      if (productIndex !== -1) {
        cart.products[productIndex].quantity += quantity;
      } else {
        cart.products.push({ productId, quantity });
      }

      carts[index] = cart;
      await writeCartsFile(carts);

      res.json(cart.products);
    } else {
      res.status(404).send('Carrinho não encontrado');
    }
  } catch (error) {
    console.error('Erro ao adicionar produto ao carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
