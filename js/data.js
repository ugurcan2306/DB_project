// ===== MOCK DATA =====

const RECIPES = [
  {
    id: 1,
    title: "Grilled Salmon with Avocado Salsa",
    chef: "Chef Marco Rossi",
    chefRating: 4.8,
    rating: 4.7,
    reviewCount: 128,
    time: 35,
    difficulty: "Medium",
    diet: ["Keto"],
    image: "\ud83c\udf63",
    baseServings: 2,
    description: "A vibrant, healthy dish featuring perfectly grilled Atlantic salmon topped with a fresh avocado and lime salsa. This keto-friendly recipe is packed with omega-3s and healthy fats.",
    ingredients: [
      { name: "Atlantic Salmon Fillet", qty: 400, unit: "g", pricePerUnit: 0.05 },
      { name: "Avocado", qty: 1, unit: "pcs", pricePerUnit: 2.50 },
      { name: "Roma Tomato", qty: 2, unit: "pcs", pricePerUnit: 0.80 },
      { name: "Red Onion", qty: 0.5, unit: "pcs", pricePerUnit: 0.60 },
      { name: "Lime", qty: 1, unit: "pcs", pricePerUnit: 0.50 },
      { name: "Olive Oil", qty: 30, unit: "ml", pricePerUnit: 0.02 },
      { name: "Garlic Cloves", qty: 3, unit: "pcs", pricePerUnit: 0.15 },
      { name: "Fresh Cilantro", qty: 15, unit: "g", pricePerUnit: 0.10 }
    ],
    steps: [
      "Pat the salmon fillets dry and season generously with salt, pepper, and a squeeze of lime juice.",
      "Heat olive oil in a grill pan over medium-high heat until shimmering.",
      "Place salmon skin-side down and cook for 4-5 minutes until the skin is crispy.",
      "Flip and cook for another 3-4 minutes until the internal temperature reaches 145\u00b0F.",
      "While the salmon cooks, dice avocado, tomato, and red onion into small cubes.",
      "Combine diced vegetables with minced garlic, chopped cilantro, lime juice, and a pinch of salt.",
      "Plate the salmon and spoon the avocado salsa generously on top. Serve immediately."
    ],
    reviews: [
      { user: "Sarah M.", rating: 5, date: "2025-12-15", text: "Absolutely divine! The salsa is the perfect complement. My family loved it." },
      { user: "David K.", rating: 4, date: "2025-11-20", text: "Great recipe, but I added a bit more lime. The salmon was cooked perfectly." },
      { user: "Emma R.", rating: 5, date: "2025-10-08", text: "Made this for a dinner party and got so many compliments. Will definitely make again!" }
    ]
  },
  {
    id: 2,
    title: "Vegan Buddha Bowl",
    chef: "Chef Aisha Patel",
    chefRating: 4.6,
    rating: 4.5,
    reviewCount: 95,
    time: 25,
    difficulty: "Easy",
    diet: ["Vegan"],
    image: "\ud83e\udd57",
    baseServings: 2,
    description: "A nourishing bowl loaded with quinoa, roasted chickpeas, sweet potato, and a creamy tahini dressing.",
    ingredients: [
      { name: "Quinoa", qty: 200, unit: "g", pricePerUnit: 0.01 },
      { name: "Chickpeas (canned)", qty: 400, unit: "g", pricePerUnit: 0.005 },
      { name: "Sweet Potato", qty: 2, unit: "pcs", pricePerUnit: 1.20 },
      { name: "Kale", qty: 100, unit: "g", pricePerUnit: 0.02 },
      { name: "Tahini", qty: 40, unit: "ml", pricePerUnit: 0.04 },
      { name: "Lemon", qty: 1, unit: "pcs", pricePerUnit: 0.50 },
      { name: "Olive Oil", qty: 20, unit: "ml", pricePerUnit: 0.02 }
    ],
    steps: [
      "Cook quinoa according to package instructions and let cool slightly.",
      "Peel and cube sweet potatoes, toss with olive oil and roast at 400\u00b0F for 25 minutes.",
      "Drain and rinse chickpeas, season with smoked paprika, and roast alongside sweet potatoes.",
      "Massage kale with a drizzle of olive oil and a pinch of salt until tender.",
      "Whisk tahini with lemon juice, a splash of water, and garlic for the dressing.",
      "Assemble bowls with quinoa base, topped with sweet potato, chickpeas, and kale.",
      "Drizzle generously with tahini dressing and serve."
    ],
    reviews: [
      { user: "Liam T.", rating: 5, date: "2025-11-30", text: "My go-to weeknight meal! So filling and delicious." },
      { user: "Priya N.", rating: 4, date: "2025-10-12", text: "Loved the tahini dressing. Added some avocado too." }
    ]
  },
  {
    id: 3,
    title: "Classic Beef Tacos",
    chef: "Chef Carlos Mendez",
    chefRating: 4.9,
    rating: 4.8,
    reviewCount: 210,
    time: 30,
    difficulty: "Easy",
    diet: [],
    image: "\ud83c\udf2e",
    baseServings: 4,
    description: "Authentic street-style beef tacos with homemade salsa, fresh cilantro, and a squeeze of lime.",
    ingredients: [
      { name: "Ground Beef", qty: 500, unit: "g", pricePerUnit: 0.02 },
      { name: "Corn Tortillas", qty: 12, unit: "pcs", pricePerUnit: 0.30 },
      { name: "Roma Tomato", qty: 3, unit: "pcs", pricePerUnit: 0.80 },
      { name: "White Onion", qty: 1, unit: "pcs", pricePerUnit: 0.50 },
      { name: "Fresh Cilantro", qty: 20, unit: "g", pricePerUnit: 0.10 },
      { name: "Lime", qty: 2, unit: "pcs", pricePerUnit: 0.50 },
      { name: "Cumin", qty: 10, unit: "g", pricePerUnit: 0.05 },
      { name: "Chili Powder", qty: 5, unit: "g", pricePerUnit: 0.08 }
    ],
    steps: [
      "Brown the ground beef in a large skillet over medium-high heat, breaking it up as it cooks.",
      "Add cumin, chili powder, salt, and pepper. Stir well and cook for 2 more minutes.",
      "Warm tortillas on a dry skillet or directly over a gas flame until pliable.",
      "Dice tomatoes and onion for the fresh salsa, mix with chopped cilantro and lime juice.",
      "Assemble tacos with seasoned beef, top with salsa.",
      "Serve with lime wedges on the side."
    ],
    reviews: [
      { user: "Mike R.", rating: 5, date: "2025-12-01", text: "Best taco recipe I've found online. Restaurant quality!" },
      { user: "Ana S.", rating: 5, date: "2025-11-15", text: "So simple yet so flavorful. A family favorite now." },
      { user: "Jake L.", rating: 4, date: "2025-10-22", text: "Added some jalapenos for extra kick. Great base recipe." }
    ]
  },
  {
    id: 4,
    title: "Mushroom Risotto",
    chef: "Chef Marco Rossi",
    chefRating: 4.8,
    rating: 4.6,
    reviewCount: 156,
    time: 45,
    difficulty: "Hard",
    diet: ["Vegetarian"],
    image: "\ud83c\udf5a",
    baseServings: 3,
    description: "Creamy Italian risotto with a medley of wild mushrooms, parmesan, and a touch of truffle oil.",
    ingredients: [
      { name: "Arborio Rice", qty: 300, unit: "g", pricePerUnit: 0.008 },
      { name: "Mixed Mushrooms", qty: 250, unit: "g", pricePerUnit: 0.03 },
      { name: "Parmesan Cheese", qty: 80, unit: "g", pricePerUnit: 0.06 },
      { name: "White Onion", qty: 1, unit: "pcs", pricePerUnit: 0.50 },
      { name: "Garlic Cloves", qty: 2, unit: "pcs", pricePerUnit: 0.15 },
      { name: "White Wine", qty: 150, unit: "ml", pricePerUnit: 0.02 },
      { name: "Vegetable Broth", qty: 1000, unit: "ml", pricePerUnit: 0.003 },
      { name: "Butter", qty: 40, unit: "g", pricePerUnit: 0.02 },
      { name: "Truffle Oil", qty: 5, unit: "ml", pricePerUnit: 0.80 }
    ],
    steps: [
      "Heat vegetable broth in a saucepan and keep it at a gentle simmer.",
      "In a separate large pan, melt half the butter and saut\u00e9 diced onion until translucent.",
      "Add minced garlic and sliced mushrooms, cook until mushrooms release their liquid.",
      "Add arborio rice and stir for 2 minutes until the grains are lightly toasted.",
      "Pour in white wine and stir until absorbed.",
      "Add warm broth one ladle at a time, stirring frequently, waiting until each addition is absorbed.",
      "Continue for 18-20 minutes until rice is creamy and al dente.",
      "Remove from heat, stir in parmesan, remaining butter, and a drizzle of truffle oil.",
      "Serve immediately, garnished with extra parmesan."
    ],
    reviews: [
      { user: "Giulia F.", rating: 5, date: "2025-12-10", text: "Tastes just like the risotto I had in Milan. Bellissimo!" },
      { user: "Tom H.", rating: 4, date: "2025-11-28", text: "Rich and creamy. Takes patience but worth every minute." }
    ]
  },
  {
    id: 5,
    title: "Thai Green Curry",
    chef: "Chef Aisha Patel",
    chefRating: 4.6,
    rating: 4.4,
    reviewCount: 87,
    time: 30,
    difficulty: "Medium",
    diet: ["Vegan"],
    image: "\ud83c\udf5b",
    baseServings: 3,
    description: "Aromatic Thai green curry with tofu, vegetables, and coconut milk. Vegan comfort food at its best.",
    ingredients: [
      { name: "Firm Tofu", qty: 300, unit: "g", pricePerUnit: 0.01 },
      { name: "Coconut Milk", qty: 400, unit: "ml", pricePerUnit: 0.005 },
      { name: "Green Curry Paste", qty: 60, unit: "g", pricePerUnit: 0.03 },
      { name: "Bell Pepper", qty: 2, unit: "pcs", pricePerUnit: 1.00 },
      { name: "Bamboo Shoots", qty: 100, unit: "g", pricePerUnit: 0.02 },
      { name: "Thai Basil", qty: 20, unit: "g", pricePerUnit: 0.15 },
      { name: "Jasmine Rice", qty: 300, unit: "g", pricePerUnit: 0.006 }
    ],
    steps: [
      "Press tofu for 15 minutes, then cut into cubes.",
      "Heat a wok over high heat with a splash of oil. Fry tofu until golden on all sides, then set aside.",
      "In the same wok, fry green curry paste for 1 minute until fragrant.",
      "Pour in coconut milk and bring to a simmer.",
      "Add sliced bell peppers and bamboo shoots. Cook for 5 minutes.",
      "Return tofu to the wok and simmer for another 5 minutes.",
      "Stir in Thai basil leaves and serve over steamed jasmine rice."
    ],
    reviews: [
      { user: "Nina W.", rating: 5, date: "2025-11-05", text: "So aromatic and comforting. Better than takeout!" },
      { user: "Ben C.", rating: 4, date: "2025-10-20", text: "Good flavor. I added extra vegetables." }
    ]
  },
  {
    id: 6,
    title: "Keto Cauliflower Mac & Cheese",
    chef: "Chef Carlos Mendez",
    chefRating: 4.9,
    rating: 4.3,
    reviewCount: 64,
    time: 40,
    difficulty: "Easy",
    diet: ["Keto", "Vegetarian"],
    image: "\ud83e\uddc0",
    baseServings: 4,
    description: "All the comfort of mac and cheese without the carbs. Cauliflower florets in a rich, cheesy sauce.",
    ingredients: [
      { name: "Cauliflower", qty: 800, unit: "g", pricePerUnit: 0.004 },
      { name: "Cheddar Cheese", qty: 200, unit: "g", pricePerUnit: 0.03 },
      { name: "Cream Cheese", qty: 100, unit: "g", pricePerUnit: 0.02 },
      { name: "Heavy Cream", qty: 120, unit: "ml", pricePerUnit: 0.01 },
      { name: "Butter", qty: 30, unit: "g", pricePerUnit: 0.02 },
      { name: "Garlic Cloves", qty: 2, unit: "pcs", pricePerUnit: 0.15 },
      { name: "Mustard Powder", qty: 5, unit: "g", pricePerUnit: 0.04 }
    ],
    steps: [
      "Cut cauliflower into florets and steam until just tender, about 8 minutes.",
      "Melt butter in a saucepan, add minced garlic and cook for 1 minute.",
      "Add heavy cream and cream cheese, stir until smooth.",
      "Add shredded cheddar and mustard powder, stir until fully melted.",
      "Add steamed cauliflower to the sauce and toss to coat.",
      "Transfer to a baking dish, top with extra cheddar.",
      "Broil for 3-5 minutes until golden and bubbly."
    ],
    reviews: [
      { user: "Kelly P.", rating: 5, date: "2025-12-05", text: "Can't believe this is keto! So cheesy and satisfying." },
      { user: "Rob M.", rating: 4, date: "2025-11-10", text: "Great low-carb alternative. Added bacon bits on top." }
    ]
  }
];

// Supplier inventory mock data
const SUPPLIERS = [
  { id: 1, name: "Green Valley Farm", location: "2.3 km away", rating: 4.8 },
  { id: 2, name: "Ocean Fresh Market", location: "3.1 km away", rating: 4.6 },
  { id: 3, name: "Sunny Acres Organic", location: "5.0 km away", rating: 4.9 }
];

const INVENTORY = {
  "Atlantic Salmon Fillet": { available: true, supplierId: 2, stock: 2000 },
  "Avocado": { available: true, supplierId: 3, stock: 50 },
  "Roma Tomato": { available: false, substitute: "Vine Tomato", reason: "ingredient taxonomy" },
  "Vine Tomato": { available: true, supplierId: 1, stock: 100 },
  "Red Onion": { available: true, supplierId: 1, stock: 80 },
  "White Onion": { available: true, supplierId: 1, stock: 80 },
  "Lime": { available: true, supplierId: 3, stock: 60 },
  "Lemon": { available: true, supplierId: 3, stock: 60 },
  "Olive Oil": { available: true, supplierId: 1, stock: 5000 },
  "Garlic Cloves": { available: true, supplierId: 1, stock: 200 },
  "Fresh Cilantro": { available: true, supplierId: 1, stock: 500 },
  "Quinoa": { available: true, supplierId: 3, stock: 3000 },
  "Chickpeas (canned)": { available: true, supplierId: 1, stock: 5000 },
  "Sweet Potato": { available: true, supplierId: 1, stock: 40 },
  "Kale": { available: true, supplierId: 3, stock: 1000 },
  "Tahini": { available: true, supplierId: 2, stock: 500 },
  "Ground Beef": { available: true, supplierId: 2, stock: 3000 },
  "Corn Tortillas": { available: true, supplierId: 1, stock: 100 },
  "Cumin": { available: true, supplierId: 1, stock: 500 },
  "Chili Powder": { available: true, supplierId: 1, stock: 300 },
  "Arborio Rice": { available: true, supplierId: 1, stock: 2000 },
  "Mixed Mushrooms": { available: true, supplierId: 3, stock: 500 },
  "Parmesan Cheese": { available: true, supplierId: 2, stock: 300 },
  "White Wine": { available: true, supplierId: 2, stock: 2000 },
  "Vegetable Broth": { available: true, supplierId: 1, stock: 5000 },
  "Butter": { available: true, supplierId: 2, stock: 1000 },
  "Truffle Oil": { available: true, supplierId: 2, stock: 100 },
  "Firm Tofu": { available: true, supplierId: 3, stock: 1000 },
  "Coconut Milk": { available: true, supplierId: 1, stock: 3000 },
  "Green Curry Paste": { available: true, supplierId: 2, stock: 500 },
  "Bell Pepper": { available: true, supplierId: 1, stock: 60 },
  "Bamboo Shoots": { available: false, substitute: null, reason: "out of stock" },
  "Thai Basil": { available: true, supplierId: 3, stock: 200 },
  "Jasmine Rice": { available: true, supplierId: 1, stock: 5000 },
  "Cauliflower": { available: true, supplierId: 1, stock: 3000 },
  "Cheddar Cheese": { available: true, supplierId: 2, stock: 500 },
  "Cream Cheese": { available: true, supplierId: 2, stock: 400 },
  "Heavy Cream": { available: true, supplierId: 2, stock: 2000 },
  "Mustard Powder": { available: true, supplierId: 1, stock: 300 }
};

// Mock user balance
let USER_BALANCE = 150.00;

// Global Notification Logic
function toggleNotifications(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
    }
  }
}

function readNotif(el) {
  el.classList.remove('unread');
  updateNotifBadge();
}

function updateNotifBadge() {
  const unreads = document.querySelectorAll('.notif-item.unread').length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (unreads === 0) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'flex';
      badge.textContent = unreads;
    }
  }
}

// Close dropdown on outside click
if (typeof window !== 'undefined') {
  window.addEventListener('click', () => {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.style.display = 'none';
  });
}
