// menu_planner/script.js
// Implements the interactive behaviour for the menu planning and shopping list tool.

// Define conversion maps for weight and volume units. The values represent
// how many grams or milliliters correspond to a single unit of the key.
const WEIGHT_UNIT_GRAMS = {
  Pounds: 453.592,
  Ounces: 28.3495,
  Grams: 1,
  Kilograms: 1000,
};
const VOLUME_UNIT_ML = {
  Liters: 1000,
  Milliliters: 1,
  Cups: 240,
};
const UNCONVERTIBLE_UNITS = ["Bag", "Case"];
const ALL_UNITS = [
  ...Object.keys(WEIGHT_UNIT_GRAMS),
  ...Object.keys(VOLUME_UNIT_ML),
  ...UNCONVERTIBLE_UNITS,
];

// Data structures stored in localStorage
let menuList = [];
let ingredientList = [];
let ingredientCatalog = {}; // { ingredient: { unit: pricePerUnit } }
let expectedSeats = 1;

// Shopping list generated from ingredientList and expectedSeats. Not persisted
let shoppingList = [];

// DOM elements
const menuTableBody = document.querySelector('#menu-table tbody');
const ingredientsTableBody = document.querySelector('#ingredients-table tbody');
const catalogTableBody = document.querySelector('#catalog-table tbody');
const shoppingTableBody = document.querySelector('#shopping-table tbody');
const expectedSeatsInput = document.querySelector('#expected-seats');

// Utility to load saved data from localStorage or seed initial data
function loadData() {
  const storedMenu = localStorage.getItem('mp_menuList');
  const storedIngredients = localStorage.getItem('mp_ingredientList');
  const storedCatalog = localStorage.getItem('mp_ingredientCatalog');
  const storedSeats = localStorage.getItem('mp_expectedSeats');
  if (storedMenu && storedIngredients && storedCatalog && storedSeats) {
    try {
      menuList = JSON.parse(storedMenu);
      ingredientList = JSON.parse(storedIngredients);
      ingredientCatalog = JSON.parse(storedCatalog);
      expectedSeats = parseInt(storedSeats, 10) || 1;
    } catch (err) {
      console.error('Failed to parse stored data', err);
      seedSampleData();
    }
  } else {
    seedSampleData();
  }
  expectedSeatsInput.value = expectedSeats;
}

// Seed with some starter dishes, ingredients and catalog entries to demonstrate functionality
function seedSampleData() {
  menuList = [
    { name: 'Salad', description: 'Fresh garden salad' },
    { name: 'Spaghetti', description: 'Classic pasta with tomato sauce' },
  ];
  ingredientList = [
    { dish: 'Salad', ingredient: 'Lettuce', amount: 0.5, unit: 'Pounds' },
    { dish: 'Salad', ingredient: 'Tomato', amount: 0.3, unit: 'Pounds' },
    { dish: 'Salad', ingredient: 'Olive Oil', amount: 0.05, unit: 'Liters' },
    { dish: 'Spaghetti', ingredient: 'Spaghetti Pasta', amount: 100, unit: 'Grams' },
    { dish: 'Spaghetti', ingredient: 'Tomato Sauce', amount: 0.5, unit: 'Liters' },
  ];
  // Example catalog: price per unit (1 unit)
  ingredientCatalog = {
    Lettuce: { Pounds: 2.0 },
    Tomato: { Pounds: 1.5 },
    'Olive Oil': { Liters: 10.0 },
    'Spaghetti Pasta': { Grams: 0.01 },
    'Tomato Sauce': { Liters: 3.0 },
  };
  expectedSeats = 4;
}

// Save current state to localStorage
function saveData() {
  localStorage.setItem('mp_menuList', JSON.stringify(menuList));
  localStorage.setItem('mp_ingredientList', JSON.stringify(ingredientList));
  localStorage.setItem('mp_ingredientCatalog', JSON.stringify(ingredientCatalog));
  localStorage.setItem('mp_expectedSeats', String(expectedSeats));
}

// Add a new dish to menuList
function addDish() {
  menuList.push({ name: '', description: '' });
  renderMenuTable();
  saveData();
}

// Remove dish at index
function removeDish(index) {
  // Remove dish and update ingredient assignments referencing this dish
  const removedDish = menuList.splice(index, 1)[0];
  // Remove any ingredients assigned to this dish
  ingredientList = ingredientList.filter(item => item.dish !== removedDish.name);
  renderMenuTable();
  renderIngredientsTable();
  saveData();
}

// Render menu table from menuList
function renderMenuTable() {
  menuTableBody.innerHTML = '';
  menuList.forEach((dish, idx) => {
    const tr = document.createElement('tr');
    // Dish name
    const nameTd = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = dish.name;
    nameInput.placeholder = 'Dish Name';
    nameInput.addEventListener('input', () => {
      dish.name = nameInput.value;
      updateDishNamesInIngredients(idx, dish.name);
      saveData();
    });
    nameTd.appendChild(nameInput);
    tr.appendChild(nameTd);
    // Description
    const descTd = document.createElement('td');
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.value = dish.description;
    descInput.placeholder = 'Description';
    descInput.addEventListener('input', () => {
      dish.description = descInput.value;
      saveData();
    });
    descTd.appendChild(descInput);
    tr.appendChild(descTd);
    // Remove button
    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => removeDish(idx));
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);
    menuTableBody.appendChild(tr);
  });
  // Update dish options in ingredients selects
  updateDishSelectOptions();
}

// Update dish references in ingredients if dish name changes
function updateDishNamesInIngredients(menuIndex, newName) {
  const oldName = menuList[menuIndex].name;
  ingredientList.forEach(item => {
    if (item.dish === oldName) {
      item.dish = newName;
    }
  });
  renderIngredientsTable();
}

// Add new ingredient row
function addIngredient() {
  ingredientList.push({ dish: menuList.length > 0 ? menuList[0].name : '', ingredient: '', amount: '', unit: ALL_UNITS[0] });
  renderIngredientsTable();
  saveData();
}

// Remove ingredient row by index
function removeIngredient(index) {
  ingredientList.splice(index, 1);
  renderIngredientsTable();
  saveData();
}

// Render ingredients table
function renderIngredientsTable() {
  ingredientsTableBody.innerHTML = '';
  ingredientList.forEach((item, idx) => {
    const tr = document.createElement('tr');
    // Dish select
    const dishTd = document.createElement('td');
    const dishSelect = document.createElement('select');
    updateSelectOptions(dishSelect, menuList.map(d => d.name));
    dishSelect.value = item.dish;
    dishSelect.addEventListener('change', () => {
      item.dish = dishSelect.value;
      saveData();
    });
    dishTd.appendChild(dishSelect);
    tr.appendChild(dishTd);
    // Ingredient name
    const ingrTd = document.createElement('td');
    const ingrInput = document.createElement('input');
    ingrInput.type = 'text';
    ingrInput.value = item.ingredient;
    ingrInput.placeholder = 'Ingredient';
    ingrInput.addEventListener('input', () => {
      item.ingredient = ingrInput.value;
      saveData();
    });
    ingrTd.appendChild(ingrInput);
    tr.appendChild(ingrTd);
    // Amount
    const amtTd = document.createElement('td');
    const amtInput = document.createElement('input');
    amtInput.type = 'number';
    amtInput.min = '0';
    amtInput.step = 'any';
    amtInput.value = item.amount;
    amtInput.placeholder = 'Amount';
    amtInput.addEventListener('input', () => {
      const val = parseFloat(amtInput.value);
      item.amount = isNaN(val) ? '' : val;
      saveData();
    });
    amtTd.appendChild(amtInput);
    tr.appendChild(amtTd);
    // Unit select
    const unitTd = document.createElement('td');
    const unitSelect = document.createElement('select');
    updateSelectOptions(unitSelect, ALL_UNITS);
    unitSelect.value = item.unit;
    unitSelect.addEventListener('change', () => {
      item.unit = unitSelect.value;
      saveData();
    });
    unitTd.appendChild(unitSelect);
    tr.appendChild(unitTd);
    // Remove button
    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => removeIngredient(idx));
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);
    ingredientsTableBody.appendChild(tr);
  });
}

// Update dish select options when menu changes
function updateDishSelectOptions() {
  // For each ingredient row, update the select options
  const selects = ingredientsTableBody.querySelectorAll('select');
  selects.forEach((select, idx) => {
    // Only update the first select (dish). The unit select is second select.
    if (idx % 2 === 0) {
      const selectedValue = select.value;
      updateSelectOptions(select, menuList.map(d => d.name));
      // If old value is gone, set to first dish
      if (!menuList.map(d => d.name).includes(selectedValue)) {
        if (menuList.length > 0) {
          select.value = menuList[0].name;
          if (ingredientList[idx / 2]) {
            ingredientList[idx / 2].dish = select.value;
          }
        }
      }
    }
  });
}

// Helper to update select options
function updateSelectOptions(selectElement, optionsArray) {
  selectElement.innerHTML = '';
  optionsArray.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    selectElement.appendChild(option);
  });
}

// Compute aggregated ingredient requirements based on expected seats
function computeShoppingData() {
  const seats = expectedSeats;
  const aggregator = {};
  ingredientList.forEach(item => {
    const { dish, ingredient, amount, unit } = item;
    if (!ingredient || amount === '' || amount === null) return;
    const totalAmount = parseFloat(amount) * seats;
    const key = ingredient;
    if (!aggregator[key]) {
      aggregator[key] = { amount: totalAmount, unit: unit };
    } else {
      // Try to convert to existing unit
      const existing = aggregator[key];
      const converted = convertAmount(totalAmount, unit, existing.unit);
      if (converted !== null) {
        existing.amount += converted;
      } else {
        // Unable to convert: create a separate key using unit to differentiate
        const newKey = `${ingredient} (${unit})`;
        if (!aggregator[newKey]) {
          aggregator[newKey] = { amount: totalAmount, unit: unit };
        } else {
          aggregator[newKey].amount += totalAmount;
        }
      }
    }
  });
  // Convert aggregator object to array
  const result = [];
  Object.keys(aggregator).forEach(key => {
    result.push({ ingredient: key, totalAmount: aggregator[key].amount, unit: aggregator[key].unit });
  });
  return result;
}

// Convert amount from one unit to another. Returns null if conversion not possible.
function convertAmount(amount, fromUnit, toUnit) {
  // Same unit
  if (fromUnit === toUnit) return amount;
  // Weight conversion
  if (WEIGHT_UNIT_GRAMS[fromUnit] && WEIGHT_UNIT_GRAMS[toUnit]) {
    const grams = amount * WEIGHT_UNIT_GRAMS[fromUnit];
    return grams / WEIGHT_UNIT_GRAMS[toUnit];
  }
  // Volume conversion
  if (VOLUME_UNIT_ML[fromUnit] && VOLUME_UNIT_ML[toUnit]) {
    const ml = amount * VOLUME_UNIT_ML[fromUnit];
    return ml / VOLUME_UNIT_ML[toUnit];
  }
  // Cannot convert
  return null;
}

// Generate shopping list from current ingredients and expected seats
function generateShoppingList() {
  const data = computeShoppingData();
  shoppingList = [];
  data.forEach(item => {
    const { ingredient, totalAmount, unit } = item;
    // Determine base ingredient name (strip unit if appended)
    const baseName = ingredient.includes(' (') ? ingredient.slice(0, ingredient.indexOf(' (')) : ingredient;
    shoppingList.push({
      ingredient: baseName,
      displayName: ingredient,
      totalAmount: totalAmount,
      unit: unit,
      numUnits: '',
      typeOfUnit: unit,
      price: '',
      priceAuto: true,
    });
  });
  renderShoppingTable();
}

// Clear shopping list (but do not touch menu, ingredients or catalog)
function clearShoppingList() {
  shoppingList = [];
  renderShoppingTable();
}

// Render shopping table
function renderShoppingTable() {
  shoppingTableBody.innerHTML = '';
  shoppingList.forEach((item, idx) => {
    const tr = document.createElement('tr');
    // Ingredient name (display)
    const ingrTd = document.createElement('td');
    ingrTd.textContent = item.displayName;
    tr.appendChild(ingrTd);
    // Total amount needed
    const totalTd = document.createElement('td');
    totalTd.textContent = Number(item.totalAmount.toFixed(3));
    tr.appendChild(totalTd);
    // Unit (read-only)
    const unitTd = document.createElement('td');
    unitTd.textContent = item.unit;
    tr.appendChild(unitTd);
    // Prepare price input ahead of events so closures capture it
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = 'any';
    priceInput.value = item.price;
    priceInput.placeholder = 'Price';
    priceInput.addEventListener('input', () => {
      // User typed something -> manual override
      item.price = priceInput.value;
      item.priceAuto = false;
      // Update catalog when both numUnits and price are set
      if (item.numUnits && item.price !== '') {
        updateCatalogFromRow(item);
      }
    });
    // Number of units dropdown
    const numTd = document.createElement('td');
    const numSelect = document.createElement('select');
    // Empty option to allow blank selection
    const blankOpt = document.createElement('option');
    blankOpt.value = '';
    blankOpt.textContent = '';
    numSelect.appendChild(blankOpt);
    for (let i = 0; i <= 100; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      numSelect.appendChild(opt);
    }
    numSelect.value = item.numUnits !== '' ? item.numUnits : '';
    numSelect.addEventListener('change', () => {
      item.numUnits = numSelect.value === '' ? '' : parseInt(numSelect.value, 10);
      // Recalculate price if auto
      updatePriceForRow(idx, priceInput);
    });
    numTd.appendChild(numSelect);
    tr.appendChild(numTd);
    // Type of unit dropdown
    const typeTd = document.createElement('td');
    const typeSelect = document.createElement('select');
    updateSelectOptions(typeSelect, ALL_UNITS);
    typeSelect.value = item.typeOfUnit;
    typeSelect.addEventListener('change', () => {
      item.typeOfUnit = typeSelect.value;
      updatePriceForRow(idx, priceInput);
    });
    typeTd.appendChild(typeSelect);
    tr.appendChild(typeTd);
    // Price input
    const priceTd = document.createElement('td');
    priceTd.appendChild(priceInput);
    tr.appendChild(priceTd);
    // Remove button (optional: remove row)
    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => {
      shoppingList.splice(idx, 1);
      renderShoppingTable();
    });
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);
    shoppingTableBody.appendChild(tr);
    // Compute initial price if auto and values present
    if (item.priceAuto && item.numUnits && item.typeOfUnit) {
      updatePriceForRow(idx, priceInput);
    }
  });
  renderCatalogTable();
}

// Update price for a specific row based on catalog and conversions
function updatePriceForRow(index, priceInputElement) {
  const item = shoppingList[index];
  // Only auto populate if priceAuto or price empty
  if (!item.priceAuto && item.price !== '') return;
  const { ingredient, numUnits, typeOfUnit } = item;
  if (!numUnits || numUnits === '' || !typeOfUnit) {
    item.price = '';
    item.priceAuto = true;
    if (priceInputElement) priceInputElement.value = '';
    return;
  }
  const unit = typeOfUnit;
  let pricePerUnit = null;
  if (ingredientCatalog[ingredient] && ingredientCatalog[ingredient][unit] !== undefined) {
    pricePerUnit = ingredientCatalog[ingredient][unit];
  } else if (ingredientCatalog[ingredient]) {
    // Attempt to convert from another unit
    const entries = ingredientCatalog[ingredient];
    const units = Object.keys(entries);
    for (const u of units) {
      const fromPrice = entries[u];
      const converted = convertPricePerUnit(fromPrice, u, unit);
      if (converted !== null) {
        pricePerUnit = converted;
        break;
      }
    }
  }
  if (pricePerUnit !== null) {
    item.price = (pricePerUnit * numUnits).toFixed(2);
    item.priceAuto = true;
    if (priceInputElement) priceInputElement.value = item.price;
  } else {
    item.price = '';
    item.priceAuto = true;
    if (priceInputElement) priceInputElement.value = '';
  }
}

// Convert price per 1 unit from one unit to another if units are convertible
function convertPricePerUnit(price, fromUnit, toUnit) {
  if (fromUnit === toUnit) return price;
  // Weight
  if (WEIGHT_UNIT_GRAMS[fromUnit] && WEIGHT_UNIT_GRAMS[toUnit]) {
    // price per gram
    const pricePerGram = price / WEIGHT_UNIT_GRAMS[fromUnit];
    return pricePerGram * WEIGHT_UNIT_GRAMS[toUnit];
  }
  // Volume
  if (VOLUME_UNIT_ML[fromUnit] && VOLUME_UNIT_ML[toUnit]) {
    const pricePerMl = price / VOLUME_UNIT_ML[fromUnit];
    return pricePerMl * VOLUME_UNIT_ML[toUnit];
  }
  // Cannot convert
  return null;
}

// Update catalog when user enters a price manually
function updateCatalogFromRow(item) {
  const { ingredient, numUnits, typeOfUnit, price } = item;
  const units = typeOfUnit;
  if (!ingredientCatalog[ingredient]) ingredientCatalog[ingredient] = {};
  const pricePerUnit = parseFloat(price) / parseFloat(numUnits);
  // Update selected unit
  ingredientCatalog[ingredient][units] = pricePerUnit;
  // If convertible, compute equivalent units and update
  if (WEIGHT_UNIT_GRAMS[units]) {
    const pricePerGram = pricePerUnit / WEIGHT_UNIT_GRAMS[units];
    Object.keys(WEIGHT_UNIT_GRAMS).forEach(u => {
      const newPrice = pricePerGram * WEIGHT_UNIT_GRAMS[u];
      ingredientCatalog[ingredient][u] = newPrice;
    });
  } else if (VOLUME_UNIT_ML[units]) {
    const pricePerMl = pricePerUnit / VOLUME_UNIT_ML[units];
    Object.keys(VOLUME_UNIT_ML).forEach(u => {
      const newPrice = pricePerMl * VOLUME_UNIT_ML[u];
      ingredientCatalog[ingredient][u] = newPrice;
    });
  } else {
    // Unconvertible, only set for this unit
    ingredientCatalog[ingredient][units] = pricePerUnit;
  }
  item.priceAuto = false;
  saveData();
  renderCatalogTable();
}

// Render catalog table from ingredientCatalog
function renderCatalogTable() {
  catalogTableBody.innerHTML = '';
  Object.keys(ingredientCatalog).forEach(ingredient => {
    const units = ingredientCatalog[ingredient];
    Object.keys(units).forEach(unit => {
      const price = units[unit];
      const tr = document.createElement('tr');
      const ingrTd = document.createElement('td');
      ingrTd.textContent = ingredient;
      tr.appendChild(ingrTd);
      const numTd = document.createElement('td');
      numTd.textContent = '1';
      tr.appendChild(numTd);
      const unitTd = document.createElement('td');
      unitTd.textContent = unit;
      tr.appendChild(unitTd);
      const priceTd = document.createElement('td');
      // Show more decimals for small values to avoid showing 0.00 for tiny prices
      let displayPrice;
      if (price < 0.01 && price > 0) {
        displayPrice = price.toFixed(4);
      } else {
        displayPrice = price.toFixed(2);
      }
      priceTd.textContent = displayPrice;
      tr.appendChild(priceTd);
      catalogTableBody.appendChild(tr);
    });
  });
}

// Event listeners for buttons and seats input
document.querySelector('#add-dish-btn').addEventListener('click', addDish);
document.querySelector('#add-ingredient-btn').addEventListener('click', addIngredient);
document.querySelector('#generate-btn').addEventListener('click', () => {
  expectedSeats = parseInt(expectedSeatsInput.value, 10) || 1;
  saveData();
  generateShoppingList();
});
document.querySelector('#clear-shopping-btn').addEventListener('click', clearShoppingList);

// Initialisation: load saved data and render tables
function init() {
  loadData();
  renderMenuTable();
  renderIngredientsTable();
  renderCatalogTable();
  // Optionally generate shopping list on load if there is existing shopping data
}

init();