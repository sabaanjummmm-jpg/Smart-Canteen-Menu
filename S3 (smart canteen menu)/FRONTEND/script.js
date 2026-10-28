
"use strict";

// ========================================
// 1. Backend Configuration
// ========================================

const API_URL = "http://localhost:3000/api/menu";

// ========================================
// 2. Get HTML Elements
// ========================================

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const menuContainer = document.getElementById("menu-container");
const menuStatus = document.getElementById("menu-status");

const menuForm = document.getElementById("menu-form");
const itemIdInput = document.getElementById("item-id");
const itemNameInput = document.getElementById("item-name");
const itemDescriptionInput = document.getElementById("item-description");
const itemCategoryInput = document.getElementById("item-category");
const itemPriceInput = document.getElementById("item-price");
const itemImageInput = document.getElementById("item-image");
const itemAvailabilityInput = document.getElementById("item-availability");

const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-button");
const formStatus = document.getElementById("form-status");

// Menu items loaded from the backend
let menuItems = [];

// ========================================
// 3. API Helper
// ========================================

async function apiRequest(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch (error) {
        throw new Error(
            "Cannot connect to the backend. Make sure server.js is running."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The backend returned an invalid response.");
    }

    if (!response.ok || result.success === false) {
        const message =
            result.message ||
            result.errors?.join(" ") ||
            `Request failed with status ${response.status}.`;

        throw new Error(message);
    }

    return result;
}

// ========================================
// 4. Load Menu from Supabase
// ========================================

async function loadMenu() {
    menuStatus.textContent = "Loading menu...";
    menuContainer.replaceChildren();

    try {
        const result = await apiRequest(API_URL);

        menuItems = result.data || [];
        filterMenu();
    } catch (error) {
        menuStatus.textContent = error.message;
        menuStatus.className = "error-message";
        console.error("Load menu error:", error);
    }
}

// ========================================
// 5. Display Menu Items
// ========================================

function displayMenu(items) {
    menuContainer.replaceChildren();

    if (items.length === 0) {
        menuStatus.textContent = "No food items found.";
        return;
    }

    menuStatus.textContent = `${items.length} food item(s) found.`;
    menuStatus.className = "";

    items.forEach((item) => {
        const card = document.createElement("article");
        card.className = "food-card";

        const image = document.createElement("img");
        image.alt = item.name;
        image.loading = "lazy";

        if (item.image_url) {
            try {
                const url = new URL(item.image_url);

                if (["http:", "https:"].includes(url.protocol)) {
                    image.src = url.href;
                }
            } catch {
                // Leave the image without a source if the URL is invalid.
            }
        }

        image.addEventListener("error", () => {
            image.removeAttribute("src");
            image.alt = `${item.name} image unavailable`;
        }, { once: true });

        const content = document.createElement("div");
        content.className = "food-card-content";

        const name = document.createElement("h3");
        name.textContent = item.name;

        const description = document.createElement("p");
        description.textContent =
            item.description || "No description available.";

        const category = document.createElement("span");
        category.className = "food-category";
        category.textContent = item.category;

        const price = document.createElement("p");
        price.className = "food-price";
        price.textContent = `₹${Number(item.price).toFixed(2)}`;

        const availability = document.createElement("p");
        availability.className = item.is_available
            ? "availability available"
            : "availability unavailable";

        availability.textContent = item.is_available
            ? "Available"
            : "Currently unavailable";

        const actions = document.createElement("div");
        actions.className = "food-card-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editMenuItem(item.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-button";
        deleteButton.addEventListener("click", () => deleteMenuItem(item.id));

        actions.append(editButton, deleteButton);

        content.append(
            name,
            description,
            category,
            price,
            availability,
            actions
        );

        card.append(image, content);
        menuContainer.appendChild(card);
    });
}

// ========================================
// 6. Search and Category Filter
// ========================================

function filterMenu() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredItems = menuItems.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const description = (item.description || "").toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            description.includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            item.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayMenu(filteredItems);
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    filterMenu();
});

searchInput.addEventListener("input", filterMenu);
categoryFilter.addEventListener("change", filterMenu);

// ========================================
// 7. Validate Form Data
// ========================================

function getFormData() {
    const name = itemNameInput.value.trim();
    const description = itemDescriptionInput.value.trim();
    const category = itemCategoryInput.value;
    const priceText = itemPriceInput.value;
    const price = Number(priceText);
    const imageUrl = itemImageInput.value.trim();
    const isAvailable = itemAvailabilityInput.value === "true";

    if (!name || name.length > 100) {
        throw new Error("Enter a food name up to 100 characters long.");
    }

    if (description.length > 300) {
        throw new Error("Description cannot exceed 300 characters.");
    }

    if (!["Breakfast", "Lunch", "Snacks", "Drinks"].includes(category)) {
        throw new Error("Please select a valid category.");
    }

    if (
        priceText.trim() === "" ||
        !Number.isFinite(price) ||
        price <= 0 ||
        price > 100000
    ) {
        throw new Error("Enter a price greater than ₹0 and at most ₹100000.");
    }

    if (imageUrl) {
        let url;

        try {
            url = new URL(imageUrl);
        } catch {
            throw new Error("Please enter a valid image URL.");
        }

        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Image URL must use HTTP or HTTPS.");
        }
    }

    return {
        name,
        description,
        category,
        price,
        image_url: imageUrl || null,
        is_available: isAvailable
    };
}

// ========================================
// 8. Add or Update Menu Item
// ========================================

menuForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    formStatus.textContent = "";

    let payload;

    try {
        payload = getFormData();
    } catch (error) {
        formStatus.textContent = error.message;
        return;
    }

    const existingId = itemIdInput.value;

    const url = existingId
        ? `${API_URL}/${encodeURIComponent(existingId)}`
        : API_URL;

    const method = existingId ? "PUT" : "POST";

    saveButton.disabled = true;
    saveButton.textContent = existingId ? "Updating..." : "Adding...";

    try {
        const result = await apiRequest(url, {
            method,
            body: JSON.stringify(payload)
        });

        formStatus.textContent = result.message ||
            (existingId ? "Menu item updated." : "Menu item added.");

        resetMenuForm();
        await loadMenu();
    } catch (error) {
        formStatus.textContent = error.message;
        console.error("Save menu item error:", error);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = itemIdInput.value
            ? "Update Food Item"
            : "Add Food Item";
    }
});

// ========================================
// 9. Edit Menu Item
// ========================================

function editMenuItem(id) {
    const item = menuItems.find(
        (menuItem) => String(menuItem.id) === String(id)
    );

    if (!item) {
        formStatus.textContent = "Menu item not found.";
        return;
    }

    itemIdInput.value = item.id;
    itemNameInput.value = item.name;
    itemDescriptionInput.value = item.description || "";
    itemCategoryInput.value = item.category;
    itemPriceInput.value = item.price;
    itemImageInput.value = item.image_url || "";
    itemAvailabilityInput.value = String(item.is_available);

    saveButton.textContent = "Update Food Item";
    cancelButton.hidden = false;
    formStatus.textContent = `Editing ${item.name}.`;

    document.getElementById("admin-section").scrollIntoView({
        behavior: "smooth"
    });

    itemNameInput.focus();
}

// ========================================
// 10. Delete Menu Item
// ========================================

async function deleteMenuItem(id) {
    const item = menuItems.find(
        (menuItem) => String(menuItem.id) === String(id)
    );

    if (!item) {
        formStatus.textContent = "Menu item not found.";
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) {
        return;
    }

    formStatus.textContent = "Deleting menu item...";

    try {
        const result = await apiRequest(
            `${API_URL}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        if (String(itemIdInput.value) === String(id)) {
            resetMenuForm();
        }

        formStatus.textContent = result.message || "Menu item deleted.";
        await loadMenu();
    } catch (error) {
        formStatus.textContent = error.message;
        console.error("Delete menu item error:", error);
    }
}

// ========================================
// 11. Reset Form
// ========================================

function resetMenuForm() {
    menuForm.reset();
    itemIdInput.value = "";
    saveButton.textContent = "Add Food Item";
    cancelButton.hidden = true;
}

cancelButton.addEventListener("click", () => {
    resetMenuForm();
    formStatus.textContent = "Editing cancelled.";
});

// ========================================
// 12. Start Application
// ========================================

loadMenu();
