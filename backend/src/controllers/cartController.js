const cartModel = require("../models/cartModel");

async function getCart(req, res) {
  const cart = await cartModel.getEnriched(req.user.sub);
  res.json(cart);
}

async function addItem(req, res) {
  const { productId, variantId, quantity } = req.body;
  const cart = await cartModel.addItem(req.user.sub, {
    productId,
    variantId: variantId || null,
    quantity: quantity ? Number(quantity) : 1,
  });
  res.status(201).json(cart);
}

async function updateItem(req, res) {
  const cart = await cartModel.updateItemQuantity(
    req.user.sub,
    req.params.itemId,
    Number(req.body.quantity),
  );
  res.json(cart);
}

async function removeItem(req, res) {
  const cart = await cartModel.removeItem(req.user.sub, req.params.itemId);
  res.json(cart);
}

/** Called once, right after login, with whatever the guest had in localStorage. */
async function mergeCart(req, res) {
  const cart = await cartModel.mergeItems(req.user.sub, req.body.items || []);
  res.json(cart);
}

module.exports = { getCart, addItem, updateItem, removeItem, mergeCart };
