// Dehydrator and Fish Smoker prices (data/dehydrator.json). The game truncates the dried price
// first and then applies the Artisan bonus, so the closed form can be 1g off; this follows the game.

// Multiply in hundredths so 325 x 1.4 is 455, not 454.99999.
const times = (n, m) => Math.floor((n * Math.round(m * 100)) / 100);
const find = (data, id) => data.machines.flatMap((m) => m.products).find((p) => p.id === id);

/** Sell price of one dried product made from items with the given base price. */
export function driedPrice(data, productId, basePrice, { artisan = true } = {}) {
  const p = find(data, productId);
  const rule = p.price;
  const plain = rule.fixed != null ? rule.fixed : times(basePrice, rule.multiplier) + rule.add;
  return artisan && p.artisan ? times(plain, data.artisan.multiplier) : plain;
}

/** Fish Smoker: smoked fish is twice the fish price (2.8 times with Artisan). */
export function smokedPrice(data, fishPrice, { artisan = true } = {}) {
  const p = find(data, 'smoked-fish');
  return times(fishPrice, artisan ? p.artisan_price.multiplier : p.price.multiplier);
}

/** What the machine earns per day when it is the limit: gold per batch over days per batch. */
export function perMachineDay(goldPerBatch, days) {
  return goldPerBatch / days;
}
