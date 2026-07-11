const calculateCommissionRate = (price) => {
  // Convert price to number if it's a string
  const productPrice = Number(price);

  // Define commission tiers
  if (productPrice >= 500000) {
    return 2; // 2% for products above 500k
  } else if (productPrice >= 280000 && productPrice <= 300000) {
    return 4; // 4% for products between 280k-300k
  } else if (productPrice >= 190000 && productPrice < 200000) {
    return 6; // 6% for products between 190k-200k
  } else if (productPrice < 50000) {
    return 10; // 10% for products below 50k
  } else {
    return 0; // No commission for products in undefined ranges
  }
};

module.exports = calculateCommissionRate; 