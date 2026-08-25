/**
 * Cytan WHS - Mini Warehouse Management System JavaScript Controller
 * 
 * This file is split into two clean, low-level modules:
 * 1. DATABASE MODULE (Raw IndexedDB wrappers using simple native steps)
 * 2. UI MODULE (jQuery DOM events, validation, table building, and modals)
 */

// ==========================================
// 1. DATABASE MODULE (IndexedDB)
// ==========================================

const DB_NAME = "CytanWarehouseDB";
const DB_VERSION = 1;
let dbInstance = null;

/**
 * Initializes the IndexedDB database.
 * Creates 'warehouses' and 'items' object stores if they do not exist.
 */
function initDB() {
  return new Promise((resolve, reject) => {
    // Open connection
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Run when database version increases or is first created
    request.onupgradeneeded = function(event) {
      const db = event.target.result;

      // Create warehouses store (keyPath is 'id', autoIncrement is true)
      if (!db.objectStoreNames.contains("warehouses")) {
        db.createObjectStore("warehouses", { keyPath: "id", autoIncrement: true });
        console.log("Created 'warehouses' object store.");
      }

      // Create items store (keyPath is 'id', autoIncrement is true)
      if (!db.objectStoreNames.contains("items")) {
        db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
        console.log("Created 'items' object store.");
      }
    };

    // Database opened successfully
    request.onsuccess = function(event) {
      dbInstance = event.target.result;
      console.log("IndexedDB loaded successfully.");
      resolve(dbInstance);
    };

    // Error opening database
    request.onerror = function(event) {
      console.error("Database error: " + event.target.errorCode);
      reject(event.target.error);
    };
  });
}

// --- WAREHOUSE CRUD FUNCTIONS ---

function getWarehouses() {
  return new Promise((resolve, reject) => {
    // Open read-only transaction on warehouses
    const transaction = dbInstance.transaction(["warehouses"], "readonly");
    const store = transaction.objectStore("warehouses");
    
    // Get all records
    const request = store.getAll();

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function getWarehouse(id) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["warehouses"], "readonly");
    const store = transaction.objectStore("warehouses");
    
    // Get a specific record by numeric ID
    const request = store.get(id);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function addWarehouse(warehouse) {
  return new Promise((resolve, reject) => {
    // Open read-write transaction
    const transaction = dbInstance.transaction(["warehouses"], "readwrite");
    const store = transaction.objectStore("warehouses");
    
    // Save record (auto-increment will assign id)
    const request = store.add(warehouse);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function updateWarehouse(warehouse) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["warehouses"], "readwrite");
    const store = transaction.objectStore("warehouses");
    
    // Put replaces the existing object with matching id
    const request = store.put(warehouse);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function deleteWarehouse(id) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["warehouses"], "readwrite");
    const store = transaction.objectStore("warehouses");
    
    const request = store.delete(id);

    request.onsuccess = function() {
      resolve();
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

// --- ITEM CRUD FUNCTIONS ---

function getItems() {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["items"], "readonly");
    const store = transaction.objectStore("items");
    
    const request = store.getAll();

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function getItem(id) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["items"], "readonly");
    const store = transaction.objectStore("items");
    
    const request = store.get(id);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function addItem(item) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    
    const request = store.add(item);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function updateItem(item) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    
    const request = store.put(item);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function deleteItem(id) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    
    const request = store.delete(id);

    request.onsuccess = function() {
      resolve();
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}


// ==========================================
// 2. UI MODULE (jQuery DOM Controller)
// ==========================================

$(document).ready(function() {
  
  // Track warehouse ID pending deletion for relationship management modal
  let warehouseIdToDelete = null;

  // Initialize DB and Load Data
  initDB()
    .then(() => {
      refreshData();
      initializeLucide();
    })
    .catch((err) => {
      showToast("Failed to initialize database: " + err, true);
    });

  // --- NAVIGATION CONTROLLER ---

  // Function to switch between active tabs
  function switchView(tabId, viewId) {
    // Hide all views
    $(".view-content").addClass("hidden");
    // Show active view
    $("#" + viewId).removeClass("hidden");

    // Remove active styles from all tabs
    $(".nav-tab").removeClass("border-sky-500 text-sky-600 font-semibold")
                 .addClass("border-transparent text-slate-500 font-medium");

    // Add active styles to clicked tab
    $("#" + tabId).addClass("border-sky-500 text-sky-600 font-semibold")
                  .removeClass("border-transparent text-slate-500 font-medium");
  }

  // Bind tab clicks
  $("#tab-dashboard").click(function() {
    switchView("tab-dashboard", "view-dashboard");
    refreshData();
  });

  $("#tab-warehouses").click(function() {
    switchView("tab-warehouses", "view-warehouses");
    refreshData();
  });

  $("#tab-items").click(function() {
    switchView("tab-items", "view-items");
    refreshData();
  });

  // Logo acts as home button
  $("#nav-logo").click(function() {
    switchView("tab-dashboard", "view-dashboard");
    refreshData();
  });

  // Dashboard shortcuts
  $("#btn-view-all-items").click(function() {
    switchView("tab-items", "view-items");
    refreshData();
  });


  // --- DATA REFRESH & RENDER ENGINE ---

  function refreshData() {
    // Parallel promise fetching for clean sync
    Promise.all([getWarehouses(), getItems()])
      .then(([warehouses, items]) => {
        
        // 1. Calculate and Render Stat Cards
        renderStatistics(warehouses, items);

        // 2. Populate Dropdowns in forms & filters
        populateDropdowns(warehouses);

        // 3. Render Dashboard Views
        renderDashboard(warehouses, items);

        // 4. Render Warehouse Table
        renderWarehousesTable(warehouses, items);

        // 5. Render Items Table
        renderItemsTable(warehouses, items);

        // Re-trigger icon loading since new dynamic elements were rendered
        initializeLucide();
      })
      .catch((err) => {
        showToast("Error retrieving database data: " + err, true);
      });
  }

  // Helper to re-render SVG icons via Lucide
  function initializeLucide() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Calculates total values and capacity limits
  function renderStatistics(warehouses, items) {
    // Set warehouse count
    $("#stat-warehouses-count").text(warehouses.length);

    // Set item count
    $("#stat-items-count").text(items.length);

    // Calculate total inventory value
    let totalValue = 0;
    let totalStockQty = 0;
    items.forEach(function(item) {
      totalValue += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
      totalStockQty += (parseInt(item.quantity) || 0);
    });
    $("#stat-total-value").text("$" + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    // Calculate warehouse capacity utilization
    let totalMaxCapacity = 0;
    warehouses.forEach(function(wh) {
      totalMaxCapacity += (parseInt(wh.capacity) || 0);
    });

    let utilizationPct = 0;
    if (totalMaxCapacity > 0) {
      utilizationPct = Math.round((totalStockQty / totalMaxCapacity) * 100);
      // Clamp to 100 max in visual display indicator
      let barPct = Math.min(utilizationPct, 100);
      $("#stat-utilization-pct").text(utilizationPct + "%");
      $("#stat-utilization-bar").css("width", barPct + "%");
    } else {
      $("#stat-utilization-pct").text("0%");
      $("#stat-utilization-bar").css("width", "0%");
    }
  }

  // Populate HTML select elements
  function populateDropdowns(warehouses) {
    // 1. Filter dropdown on Items page
    const filterSelect = $("#filter-item-warehouse");
    const currentFilterVal = filterSelect.val() || "all";
    filterSelect.empty().append('<option value="all">All Warehouses</option>');
    
    // 2. Select dropdown in Item Modal form
    const itemFormSelect = $("#item-warehouse");
    const currentFormVal = itemFormSelect.val() || "";
    itemFormSelect.empty().append('<option value="" disabled selected>Select location...</option>');

    warehouses.forEach(function(wh) {
      const optionHtml = `<option value="${wh.id}">${wh.name} (${wh.code})</option>`;
      filterSelect.append(optionHtml);
      itemFormSelect.append(optionHtml);
    });

    // Restore selected values if still valid
    filterSelect.val(currentFilterVal);
    itemFormSelect.val(currentFormVal);
  }

  // Render Dashboard sub-views (alerts, capacities list, recent additions)
  function renderDashboard(warehouses, items) {
    
    // A. Render low stock items (< 10 units)
    const lowStockAlerts = items.filter(item => parseInt(item.quantity) < 10);
    $("#low-stock-badge").text(lowStockAlerts.length + " items");

    const lowStockBody = $("#dashboard-low-stock-body");
    lowStockBody.empty();

    if (lowStockAlerts.length === 0) {
      lowStockBody.append(`
        <tr>
          <td colspan="5" class="py-8 text-center text-slate-400">
            <i data-lucide="check-circle" class="w-6 h-6 mx-auto mb-2 text-emerald-500"></i>
            All items are well stocked (no items under 10 units).
          </td>
        </tr>
      `);
    } else {
      lowStockAlerts.forEach(function(item) {
        // Find warehouse name
        const wh = warehouses.find(w => w.id === parseInt(item.warehouseId));
        const whName = wh ? `${wh.name} (${wh.code})` : '<span class="text-rose-500 italic">Unassigned</span>';
        
        let qtyClass = "text-amber-600 font-semibold";
        let statusBadge = `<span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-200">Reorder Soon</span>`;
        
        if (parseInt(item.quantity) === 0) {
          qtyClass = "text-rose-600 font-bold";
          statusBadge = `<span class="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200">Out of Stock</span>`;
        }

        const row = `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-3 px-1 font-semibold text-navy-800">${item.sku}</td>
            <td class="py-3 px-1">${item.name}</td>
            <td class="py-3 px-1 text-slate-500">${whName}</td>
            <td class="py-3 px-1 text-right ${qtyClass}">${item.quantity}</td>
            <td class="py-3 px-1 text-center">${statusBadge}</td>
          </tr>
        `;
        lowStockBody.append(row);
      });
    }

    // B. Render capacities status list
    const capacitiesContainer = $("#dashboard-capacities-list");
    capacitiesContainer.empty();

    if (warehouses.length === 0) {
      capacitiesContainer.append(`
        <div class="text-center text-slate-400 py-8">
          <i data-lucide="info" class="w-6 h-6 mx-auto mb-2"></i>
          No warehouses available.
        </div>
      `);
    } else {
      warehouses.forEach(function(wh) {
        // Calculate total items currently allocated
        const whItems = items.filter(item => parseInt(item.warehouseId) === wh.id);
        let currentQty = 0;
        whItems.forEach(item => currentQty += parseInt(item.quantity));

        const capacity = parseInt(wh.capacity) || 1;
        const pct = Math.round((currentQty / capacity) * 100);
        let progressColor = "bg-sky-500";
        if (pct > 75 && pct <= 95) progressColor = "bg-amber-500";
        if (pct > 95) progressColor = "bg-rose-500";

        const card = `
          <div class="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2.5">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-xs font-bold text-navy-900">${wh.name}</h4>
                <p class="text-[10px] text-slate-400">${wh.location} | Code: ${wh.code}</p>
              </div>
              <span class="text-xs font-semibold ${pct > 95 ? 'text-rose-600' : 'text-slate-500'}">${currentQty} / ${capacity} units</span>
            </div>
            <div>
              <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div class="${progressColor} h-full rounded-full transition-all duration-300" style="width: ${Math.min(pct, 100)}%"></div>
              </div>
              <div class="flex justify-between items-center text-[10px] mt-1.5">
                <span class="text-slate-400">Total Utilization</span>
                <span class="font-bold text-slate-600">${pct}%</span>
              </div>
            </div>
          </div>
        `;
        capacitiesContainer.append(card);
      });
    }

    // C. Render recent additions (Last 5 items)
    const recentItems = [...items].reverse().slice(0, 5);
    const recentBody = $("#dashboard-recent-items-body");
    recentBody.empty();

    if (recentItems.length === 0) {
      recentBody.append(`
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400">No items available. Add inventory items.</td>
        </tr>
      `);
    } else {
      recentItems.forEach(function(item) {
        const wh = warehouses.find(w => w.id === parseInt(item.warehouseId));
        const whName = wh ? `${wh.name} (${wh.code})` : '<span class="text-rose-500 italic">Unassigned</span>';
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 0;
        const total = price * qty;

        const row = `
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-3.5 px-4 font-semibold text-navy-900">${item.sku}</td>
            <td class="py-3.5 px-4 font-medium">${item.name}</td>
            <td class="py-3.5 px-4 text-slate-500">${whName}</td>
            <td class="py-3.5 px-4 text-right text-slate-600">$${price.toFixed(2)}</td>
            <td class="py-3.5 px-4 text-right font-medium">${qty}</td>
            <td class="py-3.5 px-4 text-right font-semibold text-navy-950">$${total.toFixed(2)}</td>
          </tr>
        `;
        recentBody.append(row);
      });
    }
  }

  // Render Warehouse View Table
  function renderWarehousesTable(warehouses, items) {
    const tableBody = $("#warehouses-table-body");
    tableBody.empty();

    if (warehouses.length === 0) {
      tableBody.append(`
        <tr>
          <td colspan="6" class="py-12 text-center text-slate-400">
            <i data-lucide="warehouse" class="w-10 h-10 mx-auto text-slate-300 mb-3"></i>
            <p class="font-semibold">No Warehouses Configured</p>
            <p class="text-xs text-slate-400 mt-1">Create a warehouse facility to start storing goods.</p>
          </td>
        </tr>
      `);
      return;
    }

    warehouses.forEach(function(wh) {
      // Find count of items in this warehouse
      const whItems = items.filter(item => parseInt(item.warehouseId) === wh.id);
      const uniqueItemTypes = whItems.length;
      
      let totalStock = 0;
      whItems.forEach(item => totalStock += parseInt(item.quantity) || 0);

      const capacity = parseInt(wh.capacity) || 1;
      const utilization = Math.round((totalStock / capacity) * 100);

      let utilizationBarColor = "bg-emerald-500";
      let utilizationTextColor = "text-emerald-700";
      if (utilization > 75 && utilization <= 95) {
        utilizationBarColor = "bg-amber-500";
        utilizationTextColor = "text-amber-700";
      } else if (utilization > 95) {
        utilizationBarColor = "bg-rose-500";
        utilizationTextColor = "text-rose-700";
      }

      const row = `
        <tr class="hover:bg-slate-50/50 transition-colors">
          <td class="py-4 px-6 font-bold text-navy-900">${wh.code}</td>
          <td class="py-4 px-6 font-medium text-slate-900">${wh.name}</td>
          <td class="py-4 px-6 text-slate-500">${wh.location}</td>
          <td class="py-4 px-6 text-right font-semibold text-slate-600">${uniqueItemTypes} types</td>
          <td class="py-4 px-6 text-right">
            <div class="flex items-center justify-end space-x-2.5">
              <span class="text-xs font-bold ${utilizationTextColor}">${utilization}%</span>
              <div class="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div class="${utilizationBarColor} h-full rounded-full" style="width: ${Math.min(utilization, 100)}%"></div>
              </div>
              <span class="text-slate-400 text-xs font-medium">(${totalStock}/${capacity})</span>
            </div>
          </td>
          <td class="py-4 px-6 text-center">
            <div class="flex items-center justify-center space-x-2">
              <button class="btn-edit-wh p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-all" data-id="${wh.id}" title="Edit Warehouse">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button class="btn-delete-wh p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" data-id="${wh.id}" data-name="${wh.name}" title="Delete Warehouse">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      tableBody.append(row);
    });
  }

  // Render Items View Table with searching and warehouse filters
  function renderItemsTable(warehouses, items) {
    const tableBody = $("#items-table-body");
    tableBody.empty();

    const searchQuery = ($("#filter-item-search").val() || "").toLowerCase().trim();
    const whFilter = $("#filter-item-warehouse").val() || "all";

    // Filter items array
    let filteredItems = items.filter(function(item) {
      // 1. Search Query filter (matches SKU or Name)
      const matchesSearch = item.name.toLowerCase().includes(searchQuery) || 
                            item.sku.toLowerCase().includes(searchQuery);
      
      // 2. Warehouse filter
      const matchesWarehouse = (whFilter === "all") || (parseInt(item.warehouseId) === parseInt(whFilter));

      return matchesSearch && matchesWarehouse;
    });

    if (filteredItems.length === 0) {
      tableBody.append(`
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <i data-lucide="package-open" class="w-10 h-10 mx-auto text-slate-300 mb-3"></i>
            <p class="font-semibold">No Items Found</p>
            <p class="text-xs text-slate-400 mt-1">Adjust search parameters or log a new product item.</p>
          </td>
        </tr>
      `);
      return;
    }

    filteredItems.forEach(function(item) {
      const wh = warehouses.find(w => w.id === parseInt(item.warehouseId));
      const whName = wh ? `${wh.name} (${wh.code})` : '<span class="text-rose-500 italic">Unassigned</span>';
      
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity) || 0;
      const valuation = price * qty;

      let qtyTextClass = "text-slate-900";
      if (qty === 0) {
        qtyTextClass = "text-rose-600 font-bold";
      } else if (qty < 10) {
        qtyTextClass = "text-amber-600 font-semibold";
      }

      const row = `
        <tr class="hover:bg-slate-50/50 transition-colors">
          <td class="py-4 px-6 font-bold text-navy-900">${item.sku}</td>
          <td class="py-4 px-6 font-medium text-slate-900">${item.name}</td>
          <td class="py-4 px-6 text-slate-500 font-medium">${whName}</td>
          <td class="py-4 px-6 text-right font-medium text-slate-600">$${price.toFixed(2)}</td>
          <td class="py-4 px-6 text-right font-semibold ${qtyTextClass}">
            ${qty}
            ${qty === 0 ? '<span class="block text-[9px] text-rose-500 tracking-wide uppercase font-bold mt-0.5">OUT</span>' : ''}
            ${qty > 0 && qty < 10 ? '<span class="block text-[9px] text-amber-500 tracking-wide uppercase font-bold mt-0.5">LOW</span>' : ''}
          </td>
          <td class="py-4 px-6 text-right font-bold text-navy-950">$${valuation.toFixed(2)}</td>
          <td class="py-4 px-6 text-center">
            <div class="flex items-center justify-center space-x-2">
              <button class="btn-edit-item p-1.5 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-all" data-id="${item.id}" title="Edit Item">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button class="btn-delete-item p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" data-id="${item.id}" title="Delete Item">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      tableBody.append(row);
    });
  }

  // Trigger filters on input change
  $("#filter-item-search").on("input", function() {
    getItems().then(items => {
      getWarehouses().then(warehouses => {
        renderItemsTable(warehouses, items);
        initializeLucide();
      });
    });
  });

  $("#filter-item-warehouse").on("change", function() {
    getItems().then(items => {
      getWarehouses().then(warehouses => {
        renderItemsTable(warehouses, items);
        initializeLucide();
      });
    });
  });


  // --- MODAL UTILITIES (Open/Close) ---

  // Opens a target modal and animates it
  function openModal(modalId) {
    const modal = $("#" + modalId);
    modal.removeClass("hidden");
    
    // Scale animation bounce effect
    modal.find(".relative").removeClass("scale-95").addClass("scale-100");
  }

  // Closes a target modal
  function closeModal(modalId) {
    const modal = $("#" + modalId);
    modal.find(".relative").removeClass("scale-100").addClass("scale-95");
    modal.addClass("hidden");
  }

  // Close modals clicking Cancel or X icons
  $(".btn-close-modal").click(function() {
    const modalId = $(this).attr("data-modal");
    closeModal(modalId);
  });


  // --- WAREHOUSE CRUD FORM HANDLER ---

  // Click Add Warehouse button (Main Navigation header/quick actions)
  $("#btn-add-warehouse, #btn-quick-warehouse").click(function() {
    // Reset form fields
    $("#form-warehouse")[0].reset();
    $("#warehouse-id").val(""); // empty means adding
    $("#modal-warehouse-title").text("Add New Warehouse");
    openModal("modal-warehouse");
  });

  // Handle Edit Warehouse click
  $(document).on("click", ".btn-edit-wh", function() {
    const whId = parseInt($(this).attr("data-id"));
    
    getWarehouse(whId)
      .then((wh) => {
        if (!wh) return;
        // Populate modal fields
        $("#warehouse-id").val(wh.id);
        $("#warehouse-code").val(wh.code);
        $("#warehouse-name").val(wh.name);
        $("#warehouse-location").val(wh.location);
        $("#warehouse-capacity").val(wh.capacity);

        $("#modal-warehouse-title").text("Edit Warehouse Settings");
        openModal("modal-warehouse");
      })
      .catch((err) => {
        showToast("Error reading warehouse records: " + err, true);
      });
  });

  // Handle Form Submit (Insert or Update)
  $("#form-warehouse").submit(function(event) {
    event.preventDefault();

    const whIdVal = $("#warehouse-id").val();
    const isEdit = whIdVal !== "";

    const warehouseData = {
      code: $("#warehouse-code").val().trim(),
      name: $("#warehouse-name").val().trim(),
      location: $("#warehouse-location").val().trim(),
      capacity: parseInt($("#warehouse-capacity").val())
    };

    if (isEdit) {
      warehouseData.id = parseInt(whIdVal);
    }

    // Code uniqueness validation
    getWarehouses()
      .then((warehouses) => {
        // If code is already used by another warehouse
        const codeConflict = warehouses.some(w => w.code.toUpperCase() === warehouseData.code.toUpperCase() && w.id !== warehouseData.id);
        if (codeConflict) {
          showToast("A warehouse with code '" + warehouseData.code + "' already exists.", true);
          return;
        }

        // If editing: Check capacity is not smaller than current actual inventory size!
        if (isEdit) {
          getItems().then((items) => {
            const whItems = items.filter(item => parseInt(item.warehouseId) === warehouseData.id);
            let currentQty = 0;
            whItems.forEach(item => currentQty += parseInt(item.quantity) || 0);

            if (warehouseData.capacity < currentQty) {
              showToast("Capacity cannot be less than current stored inventory quantity (" + currentQty + " units).", true);
              return;
            }

            // Save updates
            saveWarehouseRecord(warehouseData, true);
          });
        } else {
          // Save inserts
          saveWarehouseRecord(warehouseData, false);
        }
      })
      .catch((err) => {
        showToast("Database error validation: " + err, true);
      });
  });

  function saveWarehouseRecord(data, isEdit) {
    const dbAction = isEdit ? updateWarehouse(data) : addWarehouse(data);

    dbAction
      .then(() => {
        closeModal("modal-warehouse");
        refreshData();
        showToast(`Warehouse '${data.name}' saved successfully.`);
      })
      .catch((err) => {
        showToast("Could not save warehouse record: " + err, true);
      });
  }


  // --- ITEM CRUD FORM HANDLER ---

  // Click Add Item button
  $("#btn-add-item, #btn-quick-item").click(function() {
    // Check if any warehouses exist first. If not, alert!
    getWarehouses().then(warehouses => {
      if (warehouses.length === 0) {
        showToast("Create a warehouse before adding items.", true);
        return;
      }
      
      // Reset form
      $("#form-item")[0].reset();
      $("#item-id").val("");
      $("#modal-item-title").text("Add Inventory Item");
      openModal("modal-item");
    });
  });

  // Handle Edit Item click
  $(document).on("click", ".btn-edit-item", function() {
    const itemId = parseInt($(this).attr("data-id"));
    
    getItem(itemId)
      .then((item) => {
        if (!item) return;

        // Populate fields
        $("#item-id").val(item.id);
        $("#item-sku").val(item.sku);
        $("#item-name").val(item.name);
        $("#item-quantity").val(item.quantity);
        $("#item-price").val(item.price);
        $("#item-warehouse").val(item.warehouseId);

        $("#modal-item-title").text("Edit Inventory Item");
        openModal("modal-item");
      })
      .catch((err) => {
        showToast("Error retrieving item: " + err, true);
      });
  });

  // Handle Form Submit
  $("#form-item").submit(function(event) {
    event.preventDefault();

    const itemIdVal = $("#item-id").val();
    const isEdit = itemIdVal !== "";

    const itemData = {
      sku: $("#item-sku").val().trim().toUpperCase(),
      name: $("#item-name").val().trim(),
      warehouseId: parseInt($("#item-warehouse").val()),
      quantity: parseInt($("#item-quantity").val()),
      price: parseFloat($("#item-price").val())
    };

    if (isEdit) {
      itemData.id = parseInt(itemIdVal);
    }

    // Capacity limit validation and SKU uniqueness check
    Promise.all([getWarehouses(), getItems()])
      .then(([warehouses, items]) => {
        // 1. SKU Conflict check
        const skuConflict = items.some(item => item.sku === itemData.sku && item.id !== itemData.id);
        if (skuConflict) {
          showToast("Item SKU code '" + itemData.sku + "' already exists.", true);
          return;
        }

        // 2. Capacity Limit validation
        const targetWh = warehouses.find(w => w.id === itemData.warehouseId);
        if (!targetWh) {
          showToast("Target warehouse was not found.", true);
          return;
        }

        // Get count of items already stored in that warehouse (excluding the item we are currently editing)
        const whItems = items.filter(item => parseInt(item.warehouseId) === itemData.warehouseId && item.id !== itemData.id);
        let storedQty = 0;
        whItems.forEach(item => storedQty += parseInt(item.quantity) || 0);

        // Sum with the input quantity
        const totalProjectedQty = storedQty + itemData.quantity;
        const capacity = parseInt(targetWh.capacity);

        if (totalProjectedQty > capacity) {
          const remainingSpace = Math.max(0, capacity - storedQty);
          showToast(`Warehouse capacity exceeded. Only ${remainingSpace} units of space available in '${targetWh.name}'.`, true);
          return;
        }

        // Save
        const dbAction = isEdit ? updateItem(itemData) : addItem(itemData);
        dbAction
          .then(() => {
            closeModal("modal-item");
            refreshData();
            showToast(`Item '${itemData.name}' saved successfully.`);
          })
          .catch((err) => {
            showToast("Failed to write item record: " + err, true);
          });
      })
      .catch((err) => {
        showToast("Error processing inventory: " + err, true);
      });
  });


  // --- RELATIONSHIP INTEGRITY DELETE HANDLERS ---

  // A. Delete Warehouse Action
  $(document).on("click", ".btn-delete-wh", function() {
    const whId = parseInt($(this).attr("data-id"));
    const whName = $(this).attr("data-name");
    warehouseIdToDelete = whId;

    // Check if there are items linked to this warehouse
    getItems()
      .then((items) => {
        const whItems = items.filter(item => parseInt(item.warehouseId) === whId);
        
        if (whItems.length > 0) {
          // Items exist! Show relation manager modal
          $("#delete-wh-name").text(whName);
          $("#delete-wh-items-count").text(whItems.length);
          openModal("modal-delete-warehouse");
        } else {
          // No items linked, can delete immediately with standard alert confirmation
          if (confirm(`Are you sure you want to delete warehouse '${whName}'?`)) {
            performWarehouseDelete(whId, []);
          }
        }
      })
      .catch((err) => {
        showToast("Database query error: " + err, true);
      });
  });

  // Confirm delete on relation manager modal
  $("#btn-confirm-warehouse-delete").click(function() {
    const strategy = $("input[name='delete-relation-strategy']:checked").val();
    const whId = warehouseIdToDelete;

    if (!whId) return;

    getItems()
      .then((items) => {
        const whItems = items.filter(item => parseInt(item.warehouseId) === whId);

        if (strategy === "cascade") {
          // Cascade: Delete all items in IndexedDB
          const deletePromises = whItems.map(item => deleteItem(item.id));
          
          Promise.all(deletePromises)
            .then(() => {
              performWarehouseDelete(whId, [], "and all its stored items were deleted.");
            })
            .catch(err => showToast("Error executing cascade item deletions: " + err, true));

        } else if (strategy === "disassociate") {
          // Disassociate: Set warehouseId to null
          const updatePromises = whItems.map(item => {
            item.warehouseId = ""; // empty/unassigned
            return updateItem(item);
          });

          Promise.all(updatePromises)
            .then(() => {
              performWarehouseDelete(whId, [], "and items were set to Unassigned.");
            })
            .catch(err => showToast("Error disassociating warehouse items: " + err, true));
        }

        closeModal("modal-delete-warehouse");
      });
  });

  // Internal deletion runner
  function performWarehouseDelete(id, items, extraMessage = "") {
    deleteWarehouse(id)
      .then(() => {
        refreshData();
        showToast(`Warehouse deleted successfully ${extraMessage}`);
        warehouseIdToDelete = null;
      })
      .catch((err) => {
        showToast("Could not complete warehouse delete: " + err, true);
      });
  }

  // B. Delete Item Action
  $(document).on("click", ".btn-delete-item", function() {
    const itemId = parseInt($(this).attr("data-id"));
    
    getItem(itemId).then((item) => {
      if (!item) return;

      if (confirm(`Remove item '${item.name}' (SKU: ${item.sku}) from inventory?`)) {
        deleteItem(itemId)
          .then(() => {
            refreshData();
            showToast(`Item '${item.name}' removed from stock.`);
          })
          .catch((err) => {
            showToast("Failed to delete item: " + err, true);
          });
      }
    });
  });


  // --- TOAST ALERTS ---

  function showToast(message, isError = false) {
    const toast = $("#toast");
    const toastMessage = $("#toast-message");
    const iconContainer = $("#toast-icon-container");
    
    // Clear animation states
    toast.stop(true, true);
    
    // Update contents
    toastMessage.text(message);

    if (isError) {
      iconContainer.removeClass("bg-emerald-500/20 text-emerald-400").addClass("bg-rose-500/20 text-rose-400");
      iconContainer.html('<i data-lucide="alert-octagon" class="w-4 h-4"></i>');
    } else {
      iconContainer.removeClass("bg-rose-500/20 text-rose-400").addClass("bg-emerald-500/20 text-emerald-400");
      iconContainer.html('<i data-lucide="check" class="w-4 h-4"></i>');
    }

    // Refresh icons inside toast
    initializeLucide();

    // Show toast with slide-in
    toast.removeClass("translate-y-20 opacity-0 pointer-events-none")
         .addClass("translate-y-0 opacity-100");

    // Hide after 3 seconds
    setTimeout(function() {
      toast.removeClass("translate-y-0 opacity-100")
           .addClass("translate-y-20 opacity-0 pointer-events-none");
    }, 3500);
  }

});
