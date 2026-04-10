export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: string;
  isBestSelling?: boolean;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const categories: Category[] = [
  { id: "chicken-specials", name: "Chicken Specials", icon: "🍗", description: "Premium chicken delicacies, crispy & juicy" },
  { id: "kababs", name: "Kababs", icon: "🍢", description: "Authentic hand-crafted kababs" },
  { id: "samosa-tikka", name: "Samosa & Tikka", icon: "🥟", description: "Classic samosas & marinated tikkas" },
  { id: "seekh-burger", name: "Seekh & Burger Patty", icon: "🍔", description: "Seekh kababs & gourmet burger patties" },
  { id: "veg-items", name: "Veg Items", icon: "🥦", description: "Delicious vegetarian frozen treats" },
];

export const products: Product[] = [
  // Chicken Specials
  { id: "cs-1", name: "Chi. Crispy Popcorn (KFC Style)", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-2", name: "Chi. Crispy Nugget (KFC Style)", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-3", name: "Chi. Crispy Wings (KFC Style)", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-4", name: "Chi. Crispy Strips (KFC Style)", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-5", name: "Chi. Crispy Popcorn", price: 400, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-6", name: "Chi. Crispy Strips", price: 400, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-7", name: "Chi. Crispy Thread", price: 450, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-8", name: "Chi. Crispy Nugget", price: 400, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-9", name: "Chi. Cheesy Nugget", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-10", name: "Chi. Cheese Ball", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-11", name: "Chi. Shahi Roll", price: 500, category: "chicken-specials", unit: "Per 1 KG", isBestSelling: true },
  { id: "cs-12", name: "Chi. Donut", price: 450, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-13", name: "Chi. Garlic Finger", price: 450, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-14", name: "Chi. Classic Momos", price: 400, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-15", name: "Chi. Peri Peri Momos", price: 425, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-16", name: "Chi. Kurkure Momos", price: 455, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-17", name: "Chi. Cheese Momos", price: 480, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-18", name: "Chi. Kandi", price: 450, category: "chicken-specials", unit: "Per 1 KG" },
  { id: "cs-19", name: "Chi. Spring Roll", price: 450, category: "chicken-specials", unit: "Per 1 KG" },

  // Kababs
  { id: "kb-1", name: "Chi. Shami Kabab", price: 420, category: "kababs", unit: "Per 1 KG" },
  { id: "kb-2", name: "Chi. Cutlet Kabab", price: 400, category: "kababs", unit: "Per 1 KG" },
  { id: "kb-3", name: "Chi. Chatkara Kabab", price: 450, category: "kababs", unit: "Per 1 KG" },
  { id: "kb-4", name: "Chi. Cheesy Cutney Kabab", price: 450, category: "kababs", unit: "Per 1 KG" },
  { id: "kb-5", name: "Chi. Tikka Kabab", price: 450, category: "kababs", unit: "Per 1 KG" },
  { id: "kb-6", name: "Chi. Smokey Kabab", price: 450, category: "kababs", unit: "Per 1 KG" },

  // Samosa
  { id: "st-1", name: "Chi. Samosa", price: 380, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-2", name: "Chi. Pizza Samosa", price: 400, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-3", name: "Chi. Shezwan Samosa", price: 400, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-4", name: "Chi. Keema Samosa", price: 400, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-5", name: "Chi. Smokey Samosa", price: 420, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-6", name: "Chi. Al-Sufi Special Samosa", price: 420, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-7", name: "Chi. Tikka Samosa", price: 420, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-8", name: "Veg Cheese Corn Samosa", price: 360, category: "samosa-tikka", unit: "Per 1 KG" },
  // Tikka
  { id: "st-9", name: "Chi. Haryali Tikka", price: 480, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-10", name: "Chi. Italian Tikka", price: 480, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-11", name: "Chi. Reshmi Tikka", price: 480, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-12", name: "Chi. Malai Tikka", price: 480, category: "samosa-tikka", unit: "Per 1 KG" },
  { id: "st-13", name: "Chi. Tandoori Tikka", price: 480, category: "samosa-tikka", unit: "Per 1 KG" },

  // Seekh
  { id: "sb-1", name: "Chi. Seekh", price: 400, category: "seekh-burger", unit: "Per 1 KG" },
  { id: "sb-2", name: "Chi. Tandoori Seekh", price: 425, category: "seekh-burger", unit: "Per 1 KG" },
  { id: "sb-3", name: "Chi. Reshmi Seekh", price: 425, category: "seekh-burger", unit: "Per 1 KG" },
  { id: "sb-4", name: "Chi. Haryali Seekh", price: 425, category: "seekh-burger", unit: "Per 1 KG" },
  { id: "sb-5", name: "Chi. Italian Seekh", price: 425, category: "seekh-burger", unit: "Per 1 KG" },
  { id: "sb-6", name: "Chi. Smokey Seekh", price: 450, category: "seekh-burger", unit: "Per 1 KG" },
  { id: "sb-7", name: "Chi. Cheesy Seekh", price: 480, category: "seekh-burger", unit: "Per 1 KG" },
  // Burger Patty
  { id: "sb-8", name: "Chi. Crispy Burger Patty", price: 180, category: "seekh-burger", unit: "6 Pieces" },
  { id: "sb-9", name: "Chi. Zinger Burger Patty", price: 210, category: "seekh-burger", unit: "6 Pieces" },
  { id: "sb-10", name: "Chi. Tikki Burger Patty", price: 210, category: "seekh-burger", unit: "6 Pieces" },
  { id: "sb-11", name: "Grilled Chicken Patty", price: 240, category: "seekh-burger", unit: "6 Pieces" },
  { id: "sb-12", name: "Chi. Chatkara Patty", price: 240, category: "seekh-burger", unit: "6 Pieces" },
  { id: "sb-13", name: "Burger Patty (Aalu Tikki)", price: 120, category: "seekh-burger", unit: "6 Pieces" },
  { id: "sb-14", name: "Veggies Burger Patty", price: 150, category: "seekh-burger", unit: "6 Pieces" },

  // Veg Items
  { id: "vg-1", name: "Veg Spring Roll", price: 270, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-2", name: "Veg Finger", price: 250, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-3", name: "Veg Pizza Pocket", price: 250, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-4", name: "Potato Cheese Ball", price: 280, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-5", name: "Cheese Corn Nugget", price: 280, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-6", name: "Veg Mini Puff Samosa", price: 280, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-7", name: "Veg Harabhara Kabab", price: 280, category: "veg-items", unit: "Per 1 KG" },
  { id: "vg-8", name: "French Fries (500g)", price: 100, category: "veg-items", unit: "500g" },
];
