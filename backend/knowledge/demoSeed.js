const bcrypt = require('bcryptjs');

const daysAgo = (n, hourOffset = 0) => new Date(Date.now() - n * 86400000 + hourOffset * 3600000).toISOString();

const FLOW = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Reviewed'];

function buildTimeline(orderDateISO, status) {
  const base = new Date(orderDateISO).getTime();
  const H = 3600000;
  const steps = [];
  const push = (s, offsetH, note) => steps.push({ status: s, at: new Date(base + offsetH * H).toISOString(), note });
  push('Pending', 0, 'Order placed by customer');
  const i = FLOW.indexOf(status);
  if (i >= 1) push('Confirmed', 8, 'Farmer confirmed the order');
  if (i >= 2) push('Packed', 26, 'Produce packed and labelled');
  if (i >= 3) push('Shipped', 50, 'Handed to courier for delivery');
  if (i >= 4) push('Delivered', 74, 'Delivered to customer');
  if (i >= 5) push('Reviewed', 82, 'Customer submitted a review');
  if (status === 'Cancelled') push('Cancelled', 10, 'Order cancelled before dispatch');
  return steps;
}

const makeOrder = ({ id, customer, product, qty, days, status, price, address }) => {
  const orderDate = daysAgo(days);
  const totalPrice = Math.round(qty * price * 100) / 100;
  const farmerId = product.farmerId;
  return {
    id,
    customerId: customer.id,
    productId: product.id,
    farmerId,
    quantity: qty,
    totalPrice,
    address: address || customer.addresses[0].fullAddress,
    orderDate,
    status,
    timeline: buildTimeline(orderDate, status),
  };
};

function buildDemoSeed() {
  const farmer = {
    id: 1,
    name: 'Ramesh Patil',
    mobile: '9876543210',
    passwordHash: bcrypt.hashSync('farmer123', 8),
    location: 'Nashik, Maharashtra',
    soilType: 'black',
    landSize: 5,
    irrigationType: 'Drip',
    preferredCrops: ['Onion', 'Grapes', 'Tomato'],
    language: 'hi',
    bio: "5th-generation grape and onion grower from Nashik's Lasalgaon belt.",
    avatarUrl: '',
    createdAt: daysAgo(120),
  };

  const farmer2 = {
    id: 2,
    name: 'Sunita Jadhav',
    mobile: '9822001122',
    passwordHash: bcrypt.hashSync('farmer123', 8),
    location: 'Pune, Maharashtra',
    soilType: 'loamy',
    landSize: 3,
    irrigationType: 'Sprinkler',
    preferredCrops: ['Maize', 'Tur', 'Groundnut'],
    language: 'mr',
    bio: 'Organic farmer growing millets and pulses in the Pune region.',
    avatarUrl: '',
    createdAt: daysAgo(90),
  };

  const customer = {
    id: 1,
    name: 'Priya Sharma',
    mobile: '9123456780',
    passwordHash: bcrypt.hashSync('customer123', 8),
    address: 'FC Road, Shivajinagar, Pune, Maharashtra',
    addresses: [
      {
        id: 1,
        label: 'Home',
        fullAddress: 'FC Road, Shivajinagar, Pune, Maharashtra',
        pincode: '411005',
        phone: '9123456780',
        isDefault: true,
      },
      {
        id: 2,
        label: 'Office',
        fullAddress: 'Baner Road, Pune, Maharashtra',
        pincode: '411045',
        phone: '9123456780',
        isDefault: false,
      },
    ],
    createdAt: daysAgo(100),
  };

  const customer2 = {
    id: 2,
    name: 'Rahul Verma',
    mobile: '9898989898',
    passwordHash: bcrypt.hashSync('customer123', 8),
    address: 'Andheri West, Mumbai, Maharashtra',
    addresses: [
      {
        id: 1,
        label: 'Home',
        fullAddress: 'Andheri West, Mumbai, Maharashtra',
        pincode: '400058',
        phone: '9898989898',
        isDefault: true,
      },
    ],
    createdAt: daysAgo(60),
  };

  const products = [
    {
      id: 1,
      farmerId: 1,
      cropName: 'Onion',
      price: 22,
      compareToPrice: 25,
      quantity: 480,
      unit: 'kg',
      photoUrl: '/products/onion.jpg',
      approved: true,
      organic: false,
      harvestDate: daysAgo(2).slice(0, 10),
      location: 'Lasalgaon, Nashik',
      description: 'Fresh Lasalgaon onion, medium-large grade, cured for long storage.',
      createdAt: daysAgo(40),
    },
    {
      id: 2,
      farmerId: 1,
      cropName: 'Grapes',
      price: 65,
      compareToPrice: 78,
      quantity: 180,
      unit: 'kg',
      photoUrl: '/products/grapes.jpg',
      approved: true,
      organic: true,
      harvestDate: daysAgo(1).slice(0, 10),
      location: 'Nashik, Maharashtra',
      description: 'Thompson Seedless table grapes, hand-picked at optimal brix.',
      createdAt: daysAgo(35),
    },
    {
      id: 3,
      farmerId: 1,
      cropName: 'Tomato',
      price: 18,
      compareToPrice: 22,
      quantity: 260,
      unit: 'kg',
      photoUrl: '/products/tomato.jpg',
      approved: true,
      organic: false,
      harvestDate: daysAgo(0).slice(0, 10),
      location: 'Nashik, Maharashtra',
      description: 'Farm-fresh hybrid tomatoes, ideal for cooking and pasta.',
      createdAt: daysAgo(30),
    },
    {
      id: 4,
      farmerId: 1,
      cropName: 'Sugarcane',
      price: 3.5,
      quantity: 2000,
      unit: 'kg',
      photoUrl: '/products/sugarcane.jpg',
      approved: true,
      organic: false,
      harvestDate: daysAgo(3).slice(0, 10),
      location: 'Kopargaon, Nashik',
      description: 'High-SUF cane for juice and jaggery (gur) making.',
      createdAt: daysAgo(25),
    },
    {
      id: 5,
      farmerId: 1,
      cropName: 'Cotton',
      price: 68,
      compareToPrice: 80,
      quantity: 140,
      unit: 'kg',
      photoUrl: '/products/cotton.jpg',
      approved: true,
      organic: false,
      harvestDate: daysAgo(6).slice(0, 10),
      location: 'Nashik, Maharashtra',
      description: 'Clean, machine-ginned kapas with good staple length.',
      createdAt: daysAgo(20),
    },
    {
      id: 6,
      farmerId: 1,
      cropName: 'Wheat',
      price: 24,
      compareToPrice: 30,
      quantity: 350,
      unit: 'kg',
      photoUrl: '/products/wheat.jpg',
      approved: true,
      organic: true,
      harvestDate: daysAgo(5).slice(0, 10),
      location: 'Nashik, Maharashtra',
      description: 'Whole lokwan wheat, sun-dried and cleaned, ideal for rotis.',
      createdAt: daysAgo(15),
    },
    {
      id: 7,
      farmerId: 2,
      cropName: 'Maize',
      price: 21,
      compareToPrice: 26,
      quantity: 300,
      unit: 'kg',
      photoUrl: '/products/maize.jpg',
      approved: true,
      organic: true,
      harvestDate: daysAgo(1).slice(0, 10),
      location: 'Pune, Maharashtra',
      description: 'Sweet corn cob maize, organic, no chemical pesticides.',
      createdAt: daysAgo(10),
    },
    {
      id: 8,
      farmerId: 2,
      cropName: 'Tur (Pigeon Pea)',
      price: 7800,
      quantity: 40,
      unit: 'quintal',
      photoUrl: '/products/pigeonpea.jpg',
      approved: null,
      organic: true,
      harvestDate: daysAgo(8).slice(0, 10),
      location: 'Baramati, Pune',
      description: 'Toor dal grade, unpolished, sun-dried.',
      createdAt: daysAgo(9),
    },
    {
      id: 9,
      farmerId: 2,
      cropName: 'Groundnut',
      price: 5600,
      quantity: 25,
      unit: 'quintal',
      photoUrl: '/products/peanut.jpg',
      approved: null,
      organic: true,
      harvestDate: daysAgo(4).slice(0, 10),
      location: 'Pune, Maharashtra',
      description: 'Bold-kernel groundnut, rain-fed and naturally dried.',
      createdAt: daysAgo(8),
    },
  ];

  const orders = [
    makeOrder({ id: 1, customer, product: products[1], qty: 5, days: 6, status: 'Reviewed', price: 65 }),
    makeOrder({ id: 2, customer, product: products[0], qty: 10, days: 1, status: 'Pending', price: 22 }),
    makeOrder({ id: 3, customer: customer2, product: products[6], qty: 8, days: 3, status: 'Confirmed', price: 21 }),
    makeOrder({ id: 4, customer, product: products[5], qty: 12, days: 2, status: 'Shipped', price: 24 }),
    makeOrder({ id: 5, customer: customer2, product: products[7], qty: 2, days: 5, status: 'Delivered', price: 7800 }),
    makeOrder({ id: 6, customer, product: products[3], qty: 15, days: 9, status: 'Cancelled', price: 3.5 }),
    makeOrder({ id: 7, customer, product: products[4], qty: 8, days: 0, status: 'Pending', price: 68 }),
  ];

  const reviews = [
    {
      id: 1,
      customerId: 1,
      productId: 2,
      rating: 5,
      comment: 'Excellent quality grapes, very fresh and sweet. Will order again!',
      createdAt: daysAgo(4),
    },
    {
      id: 2,
      customerId: 2,
      productId: 7,
      rating: 4,
      comment: 'Tasty organic maize. Slightly late delivery but great produce.',
      createdAt: daysAgo(2),
    },
    {
      id: 3,
      customerId: 2,
      productId: 8,
      rating: 5,
      comment: 'Clean dal, premium quality tur.',
      createdAt: daysAgo(3),
    },
  ];

  const equipment = [
    {
      id: 1,
      farmerId: 1,
      type: 'Tractor (45 HP)',
      rentPerDay: 1200,
      availability: true,
      photoUrl: '',
      description: 'Mahindra 475 tractor with cultivator attachment.',
      createdAt: daysAgo(30),
    },
    {
      id: 2,
      farmerId: 1,
      type: 'Rotavator',
      rentPerDay: 600,
      availability: true,
      photoUrl: '',
      description: '6ft rotavator for land preparation.',
      createdAt: daysAgo(28),
    },
    {
      id: 3,
      farmerId: 2,
      type: 'Sprayer (Knapsack, 16L)',
      rentPerDay: 150,
      availability: true,
      photoUrl: '',
      description: 'Battery-powered knapsack sprayer.',
      createdAt: daysAgo(20),
    },
  ];

  const wishlist = [
    { id: 1, customerId: 1, productId: 2, createdAt: daysAgo(5) },
    { id: 2, customerId: 1, productId: 7, createdAt: daysAgo(3) },
  ];

  const recommendations = [
    {
      id: 1,
      farmerId: 1,
      location: 'Nashik, Maharashtra',
      soilType: 'black',
      season: 'kharif',
      recommendedCrops: 'Cotton, Tur (Pigeon Pea)',
      createdAt: daysAgo(12),
    },
    {
      id: 2,
      farmerId: 2,
      location: 'Pune, Maharashtra',
      soilType: 'loamy',
      season: 'rabi',
      recommendedCrops: 'Wheat, Onion, Tomato',
      createdAt: daysAgo(8),
    },
  ];

  return { farmer, farmer2, customer, customer2, products, orders, reviews, equipment, wishlist, recommendations };
}

module.exports = { buildDemoSeed, buildTimeline, FLOW };
