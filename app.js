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

var DB_NAME = "CytanWarehouseDB";
var DB_VERSION = 1;
var dbInstance = null;

/**
 * Initializes the IndexedDB database.
 * Creates 'warehouses' and 'items' object stores if they do not exist.
 */
function initDB() {
  return new Promise(function(resolve, reject) {
    // Open connection
    var request = indexedDB.open(DB_NAME, DB_VERSION);

    // Run when database version increases or is first created
    request.onupgradeneeded = function(event) {
      var db = event.target.result;

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
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["warehouses"], "readonly");
    var store = transaction.objectStore("warehouses");
    var request = store.getAll();

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function getWarehouse(id) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["warehouses"], "readonly");
    var store = transaction.objectStore("warehouses");
    var request = store.get(id);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function addWarehouse(warehouse) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["warehouses"], "readwrite");
    var store = transaction.objectStore("warehouses");
    var request = store.add(warehouse);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function updateWarehouse(warehouse) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["warehouses"], "readwrite");
    var store = transaction.objectStore("warehouses");
    var request = store.put(warehouse);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function deleteWarehouse(id) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["warehouses"], "readwrite");
    var store = transaction.objectStore("warehouses");
    var request = store.delete(id);

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
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["items"], "readonly");
    var store = transaction.objectStore("items");
    var request = store.getAll();

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function getItem(id) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["items"], "readonly");
    var store = transaction.objectStore("items");
    var request = store.get(id);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function addItem(item) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["items"], "readwrite");
    var store = transaction.objectStore("items");
    var request = store.add(item);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function updateItem(item) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["items"], "readwrite");
    var store = transaction.objectStore("items");
    var request = store.put(item);

    request.onsuccess = function() {
      resolve(request.result);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function deleteItem(id) {
  return new Promise(function(resolve, reject) {
    var transaction = dbInstance.transaction(["items"], "readwrite");
    var store = transaction.objectStore("items");
    var request = store.delete(id);

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
  var warehouseIdToDelete = null;

  // Initialize DB and Load Data
  initDB()
    .then(function() {
      refreshData();
      initializeLucide();
    })
    .catch(function(err) {
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
    switchView("tab-warehouses", "view-warehouses");
    refreshData();
  });


  // --- DATA REFRESH & RENDER ENGINE ---

  function refreshData() {
    // Fetch data in parallel
    Promise.all([getWarehouses(), getItems()])
      .then(function(results) {
        var warehouses = results[0];
        var items = results[1];

        // 1. Populate Dropdowns in forms & filters
        populateDropdowns(warehouses);

        // 2. Render Warehouse Table
        renderWarehousesTable(warehouses, items);

        // 3. Render Items Table
        renderItemsTable(warehouses, items);

        // Re-trigger icon loading since new dynamic elements were rendered
        initializeLucide();
      })
      .catch(function(err) {
        showToast("Error retrieving database data: " + err, true);
      });
  }

  // Helper to re-render SVG icons via Lucide
  function initializeLucide() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Populate HTML select elements
  function populateDropdowns(warehouses) {
    var filterSelect = $("#filter-item-warehouse");
    var currentFilterVal = filterSelect.val() || "all";
    filterSelect.empty().append('<option value="all">All Warehouses</option>');
    
    var itemFormSelect = $("#item-warehouse");
    var currentFormVal = itemFormSelect.val() || "";
    itemFormSelect.empty().append('<option value="" disabled selected>Select location...</option>');

    // Standard for loop instead of forEach
    for (var i = 0; i < warehouses.length; i++) {
      var wh = warehouses[i];
      var optionHtml = '<option value="' + wh.id + '">' + wh.name + ' (' + wh.code + ')</option>';
      filterSelect.append(optionHtml);
      itemFormSelect.append(optionHtml);
    }

    // Restore selected values if still valid
    filterSelect.val(currentFilterVal);
    itemFormSelect.val(currentFormVal);
  }

  // Render Warehouse View Table
  function renderWarehousesTable(warehouses, items) {
    var tableBody = $("#warehouses-table-body");
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

    // Standard for loop instead of forEach
    for (var i = 0; i < warehouses.length; i++) {
      var wh = warehouses[i];

      // Find count of items and total stock quantity in this warehouse using a simple loop
      var whItems = [];
      for (var j = 0; j < items.length; j++) {
        if (parseInt(items[j].warehouseId) === wh.id) {
          whItems.push(items[j]);
        }
      }

      var uniqueItemTypes = whItems.length;
      
      var totalStock = 0;
      for (var k = 0; k < whItems.length; k++) {
        totalStock += parseInt(whItems[k].quantity) || 0;
      }

      var capacity = parseInt(wh.capacity) || 1;
      var utilization = Math.round((totalStock / capacity) * 100);

      var utilizationBarColor = "bg-emerald-500";
      var utilizationTextColor = "text-emerald-700";
      if (utilization > 75 && utilization <= 95) {
        utilizationBarColor = "bg-amber-500";
        utilizationTextColor = "text-amber-700";
      } else if (utilization > 95) {
        utilizationBarColor = "bg-rose-500";
        utilizationTextColor = "text-rose-700";
      }

      var row = `
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
    }
  }

  // Render Items View Table with searching and warehouse filters
  function renderItemsTable(warehouses, items) {
    var tableBody = $("#items-table-body");
    tableBody.empty();

    var searchQuery = ($("#filter-item-search").val() || "").toLowerCase().trim();
    var whFilter = $("#filter-item-warehouse").val() || "all";

    // Filter items array manually using a simple loop
    var filteredItems = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      
      // 1. Search Query check
      var matchesSearch = item.name.toLowerCase().indexOf(searchQuery) !== -1 || 
                          item.sku.toLowerCase().indexOf(searchQuery) !== -1;
      
      // 2. Warehouse Filter check
      var matchesWarehouse = false;
      if (whFilter === "all") {
        matchesWarehouse = true;
      } else {
        if (parseInt(item.warehouseId) === parseInt(whFilter)) {
          matchesWarehouse = true;
        }
      }

      if (matchesSearch && matchesWarehouse) {
        filteredItems.push(item);
      }
    }

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

    // Loop through results and render
    for (var i = 0; i < filteredItems.length; i++) {
      var item = filteredItems[i];

      // Find warehouse name manually using a simple loop
      var wh = null;
      for (var j = 0; j < warehouses.length; j++) {
        if (warehouses[j].id === parseInt(item.warehouseId)) {
          wh = warehouses[j];
          break;
        }
      }

      var whName = '<span class="text-rose-500 italic">Unassigned</span>';
      if (wh) {
        whName = wh.name + " (" + wh.code + ")";
      }
      
      var price = parseFloat(item.price) || 0;
      var qty = parseInt(item.quantity) || 0;
      var valuation = price * qty;

      var qtyTextClass = "text-slate-900";
      var statusSubtext = "";

      if (qty === 0) {
        qtyTextClass = "text-rose-600 font-bold";
        statusSubtext = '<span class="block text-[9px] text-rose-500 tracking-wide uppercase font-bold mt-0.5">OUT</span>';
      } else if (qty > 0 && qty < 10) {
        qtyTextClass = "text-amber-600 font-semibold";
        statusSubtext = '<span class="block text-[9px] text-amber-500 tracking-wide uppercase font-bold mt-0.5">LOW</span>';
      }

      var row = `
        <tr class="hover:bg-slate-50/50 transition-colors">
          <td class="py-4 px-6 font-bold text-navy-900">${item.sku}</td>
          <td class="py-4 px-6 font-medium text-slate-900">${item.name}</td>
          <td class="py-4 px-6 text-slate-500 font-medium">${whName}</td>
          <td class="py-4 px-6 text-right font-medium text-slate-600">$${price.toFixed(2)}</td>
          <td class="py-4 px-6 text-right font-semibold ${qtyTextClass}">
            ${qty}
            ${statusSubtext}
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
    }
  }

  // Trigger filters on input change
  $("#filter-item-search").on("input", function() {
    getItems().then(function(items) {
      getWarehouses().then(function(warehouses) {
        renderItemsTable(warehouses, items);
        initializeLucide();
      });
    });
  });

  $("#filter-item-warehouse").on("change", function() {
    getItems().then(function(items) {
      getWarehouses().then(function(warehouses) {
        renderItemsTable(warehouses, items);
        initializeLucide();
      });
    });
  });


  // --- MODAL UTILITIES (Open/Close) ---

  // Opens a target modal and animates it
  function openModal(modalId) {
    var modal = $("#" + modalId);
    modal.removeClass("hidden");
    modal.find(".relative").removeClass("scale-95").addClass("scale-100");
  }

  // Closes a target modal
  function closeModal(modalId) {
    var modal = $("#" + modalId);
    modal.find(".relative").removeClass("scale-100").addClass("scale-95");
    modal.addClass("hidden");
  }

  // Close modals clicking Cancel or X icons
  $(".btn-close-modal").click(function() {
    var modalId = $(this).attr("data-modal");
    closeModal(modalId);
  });


  // --- WAREHOUSE CRUD FORM HANDLER ---

  // Click Add Warehouse button (Main Navigation header/quick actions)
  $("#btn-add-warehouse").click(function() {
    $("#form-warehouse")[0].reset();
    $("#warehouse-id").val(""); // empty means adding
    $("#modal-warehouse-title").text("Add New Warehouse");
    openModal("modal-warehouse");
  });

  // Handle Edit Warehouse click
  $(document).on("click", ".btn-edit-wh", function() {
    var whId = parseInt($(this).attr("data-id"));
    
    getWarehouse(whId)
      .then(function(wh) {
        if (!wh) return;
        $("#warehouse-id").val(wh.id);
        $("#warehouse-code").val(wh.code);
        $("#warehouse-name").val(wh.name);
        $("#warehouse-location").val(wh.location);
        $("#warehouse-capacity").val(wh.capacity);

        $("#modal-warehouse-title").text("Edit Warehouse Settings");
        openModal("modal-warehouse");
      })
      .catch(function(err) {
        showToast("Error reading warehouse records: " + err, true);
      });
  });

  // Handle Form Submit (Insert or Update)
  $("#form-warehouse").submit(function(event) {
    event.preventDefault();

    var whIdVal = $("#warehouse-id").val();
    var isEdit = whIdVal !== "";

    var warehouseData = {
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
      .then(function(warehouses) {
        // If code is already used by another warehouse manually checked in a loop
        var codeConflict = false;
        for (var i = 0; i < warehouses.length; i++) {
          if (warehouses[i].code.toUpperCase() === warehouseData.code.toUpperCase() && warehouses[i].id !== warehouseData.id) {
            codeConflict = true;
            break;
          }
        }

        if (codeConflict) {
          showToast("A warehouse with code '" + warehouseData.code + "' already exists.", true);
          return;
        }

        // If editing: Check capacity is not smaller than current actual inventory size!
        if (isEdit) {
          getItems().then(function(items) {
            
            // Filter warehouse items manually
            var whItems = [];
            for (var i = 0; i < items.length; i++) {
              if (parseInt(items[i].warehouseId) === warehouseData.id) {
                whItems.push(items[i]);
              }
            }

            var currentQty = 0;
            for (var j = 0; j < whItems.length; j++) {
              currentQty += parseInt(whItems[j].quantity) || 0;
            }

            if (warehouseData.capacity < currentQty) {
              showToast("Capacity cannot be less than current stored inventory quantity (" + currentQty + " units).", true);
              return;
            }

            saveWarehouseRecord(warehouseData, true);
          });
        } else {
          saveWarehouseRecord(warehouseData, false);
        }
      })
      .catch(function(err) {
        showToast("Database error validation: " + err, true);
      });
  });

  function saveWarehouseRecord(data, isEdit) {
    var dbAction = isEdit ? updateWarehouse(data) : addWarehouse(data);

    dbAction
      .then(function() {
        closeModal("modal-warehouse");
        refreshData();
        showToast("Warehouse '" + data.name + "' saved successfully.");
      })
      .catch(function(err) {
        showToast("Could not save warehouse record: " + err, true);
      });
  }


  // --- ITEM CRUD FORM HANDLER ---

  // Click Add Item button
  $("#btn-add-item").click(function() {
    getWarehouses().then(function(warehouses) {
      if (warehouses.length === 0) {
        showToast("Create a warehouse before adding items.", true);
        return;
      }
      
      $("#form-item")[0].reset();
      $("#item-id").val("");
      $("#modal-item-title").text("Add Inventory Item");
      openModal("modal-item");
    });
  });

  // Handle Edit Item click
  $(document).on("click", ".btn-edit-item", function() {
    var itemId = parseInt($(this).attr("data-id"));
    
    getItem(itemId)
      .then(function(item) {
        if (!item) return;

        $("#item-id").val(item.id);
        $("#item-sku").val(item.sku);
        $("#item-name").val(item.name);
        $("#item-quantity").val(item.quantity);
        $("#item-price").val(item.price);
        $("#item-warehouse").val(item.warehouseId);

        $("#modal-item-title").text("Edit Inventory Item");
        openModal("modal-item");
      })
      .catch(function(err) {
        showToast("Error retrieving item: " + err, true);
      });
  });

  // Handle Form Submit
  $("#form-item").submit(function(event) {
    event.preventDefault();

    var itemIdVal = $("#item-id").val();
    var isEdit = itemIdVal !== "";

    var itemData = {
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
      .then(function(results) {
        var warehouses = results[0];
        var items = results[1];

        // 1. SKU Conflict check manually in a loop
        var skuConflict = false;
        for (var i = 0; i < items.length; i++) {
          if (items[i].sku === itemData.sku && items[i].id !== itemData.id) {
            skuConflict = true;
            break;
          }
        }

        if (skuConflict) {
          showToast("Item SKU code '" + itemData.sku + "' already exists.", true);
          return;
        }

        // 2. Capacity Limit validation manually
        var targetWh = null;
        for (var j = 0; j < warehouses.length; j++) {
          if (warehouses[j].id === itemData.warehouseId) {
            targetWh = warehouses[j];
            break;
          }
        }

        if (!targetWh) {
          showToast("Target warehouse was not found.", true);
          return;
        }

        // Get count of items already stored in that warehouse (excluding the item we are currently editing)
        var whItems = [];
        for (var k = 0; k < items.length; k++) {
          if (parseInt(items[k].warehouseId) === itemData.warehouseId && items[k].id !== itemData.id) {
            whItems.push(items[k]);
          }
        }

        var storedQty = 0;
        for (var m = 0; m < whItems.length; m++) {
          storedQty += parseInt(whItems[m].quantity) || 0;
        }

        // Sum with the input quantity
        var totalProjectedQty = storedQty + itemData.quantity;
        var capacity = parseInt(targetWh.capacity);

        if (totalProjectedQty > capacity) {
          var remainingSpace = Math.max(0, capacity - storedQty);
          showToast("Warehouse capacity exceeded. Only " + remainingSpace + " units of space available in '" + targetWh.name + "'.", true);
          return;
        }

        // Save
        var dbAction = isEdit ? updateItem(itemData) : addItem(itemData);
        dbAction
          .then(function() {
            closeModal("modal-item");
            refreshData();
            showToast("Item '" + itemData.name + "' saved successfully.");
          })
          .catch(function(err) {
            showToast("Failed to write item record: " + err, true);
          });
      })
      .catch(function(err) {
        showToast("Error processing inventory: " + err, true);
      });
  });


  // --- RELATIONSHIP INTEGRITY DELETE HANDLERS ---

  // A. Delete Warehouse Action
  $(document).on("click", ".btn-delete-wh", function() {
    var whId = parseInt($(this).attr("data-id"));
    var whName = $(this).attr("data-name");
    warehouseIdToDelete = whId;

    // Check if there are items linked to this warehouse manually
    getItems()
      .then(function(items) {
        var whItems = [];
        for (var i = 0; i < items.length; i++) {
          if (parseInt(items[i].warehouseId) === whId) {
            whItems.push(items[i]);
          }
        }
        
        if (whItems.length > 0) {
          // Items exist! Show relation manager modal
          $("#delete-wh-name").text(whName);
          $("#delete-wh-items-count").text(whItems.length);
          openModal("modal-delete-warehouse");
        } else {
          // No items linked, can delete immediately with standard alert confirmation
          if (confirm("Are you sure you want to delete warehouse '" + whName + "'?")) {
            performWarehouseDelete(whId, [], "");
          }
        }
      })
      .catch(function(err) {
        showToast("Database query error: " + err, true);
      });
  });

  // Confirm delete on relation manager modal
  $("#btn-confirm-warehouse-delete").click(function() {
    var strategy = $("input[name='delete-relation-strategy']:checked").val();
    var whId = warehouseIdToDelete;

    if (!whId) return;

    getItems()
      .then(function(items) {
        var whItems = [];
        for (var i = 0; i < items.length; i++) {
          if (parseInt(items[i].warehouseId) === whId) {
            whItems.push(items[i]);
          }
        }

        if (strategy === "cascade") {
          // Cascade: Delete all items in IndexedDB manually loop and delete
          var deletePromises = [];
          for (var j = 0; j < whItems.length; j++) {
            deletePromises.push(deleteItem(whItems[j].id));
          }
          
          Promise.all(deletePromises)
            .then(function() {
              performWarehouseDelete(whId, [], "and all its stored items were deleted.");
            })
            .catch(function(err) {
              showToast("Error executing cascade item deletions: " + err, true);
            });

        } else if (strategy === "disassociate") {
          // Disassociate: Set warehouseId to null/empty
          var updatePromises = [];
          for (var k = 0; k < whItems.length; k++) {
            var item = whItems[k];
            item.warehouseId = ""; // empty/unassigned
            updatePromises.push(updateItem(item));
          }

          Promise.all(updatePromises)
            .then(function() {
              performWarehouseDelete(whId, [], "and items were set to Unassigned.");
            })
            .catch(function(err) {
              showToast("Error disassociating warehouse items: " + err, true);
            });
        }

        closeModal("modal-delete-warehouse");
      });
  });

  // Internal deletion runner
  function performWarehouseDelete(id, items, extraMessage) {
    deleteWarehouse(id)
      .then(function() {
        refreshData();
        showToast("Warehouse deleted successfully " + extraMessage);
        warehouseIdToDelete = null;
      })
      .catch(function(err) {
        showToast("Could not complete warehouse delete: " + err, true);
      });
  }

  // B. Delete Item Action
  $(document).on("click", ".btn-delete-item", function() {
    var itemId = parseInt($(this).attr("data-id"));
    
    getItem(itemId).then(function(item) {
      if (!item) return;

      if (confirm("Remove item '" + item.name + "' (SKU: " + item.sku + ") from inventory?")) {
        deleteItem(itemId)
          .then(function() {
            refreshData();
            showToast("Item '" + item.name + "' removed from stock.");
          })
          .catch(function(err) {
            showToast("Failed to delete item: " + err, true);
          });
      }
    });
  });


  // --- TOAST ALERTS ---

  function showToast(message, isError) {
    var toast = $("#toast");
    var toastMessage = $("#toast-message");
    var iconContainer = $("#toast-icon-container");
    
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
