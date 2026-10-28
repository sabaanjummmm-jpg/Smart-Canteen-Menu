
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// 1. Middleware
// ========================================

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// ========================================
// 2. Helper: Validate Menu Item
// ========================================

const validCategories = [
    "Breakfast",
    "Lunch",
    "Snacks",
    "Drinks"
];

function validateMenuItem(data) {
    const errors = [];

    if (
        typeof data.name !== "string" ||
        data.name.trim().length === 0 ||
        data.name.trim().length > 100
    ) {
        errors.push("Name is required and must be at most 100 characters.");
    }

    if (
        data.description !== undefined &&
        (
            typeof data.description !== "string" ||
            data.description.length > 300
        )
    ) {
        errors.push("Description must be at most 300 characters.");
    }

    if (!validCategories.includes(data.category)) {
        errors.push("Select a valid category.");
    }

    const price = Number(data.price);

    if (
        data.price === undefined ||
        data.price === null ||
        data.price === "" ||
        !Number.isFinite(price) ||
        price <= 0 ||
        price > 100000
    ) {
        errors.push("Price must be greater than 0 and at most 100000.");
    }

    if (
        data.is_available !== undefined &&
        typeof data.is_available !== "boolean"
    ) {
        errors.push("is_available must be true or false.");
    }

    if (data.image_url !== undefined && data.image_url !== null) {
        if (typeof data.image_url !== "string") {
            errors.push("Image URL must be text.");
        } else if (data.image_url !== "") {
            try {
                const url = new URL(data.image_url);

                if (url.protocol !== "http:" && url.protocol !== "https:") {
                    errors.push("Image URL must use HTTP or HTTPS.");
                }
            } catch {
                errors.push("Enter a valid image URL.");
            }
        }
    }

    return errors;
}

function createMenuPayload(data) {
    return {
        name: data.name.trim(),
        description: (data.description || "").trim(),
        category: data.category,
        price: Number(data.price),
        image_url: data.image_url || null,
        is_available: data.is_available ?? true
    };
}

// ========================================
// 3. Health Check
// ========================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Smart Canteen Menu backend is running."
    });
});

// ========================================
// 4. Get All Menu Items
// GET /api/menu
// ========================================

app.get("/api/menu", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("menu_items")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase read error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve menu items."
            });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Unexpected read error:", error.message);

        res.status(500).json({
            success: false,
            message: "An unexpected server error occurred."
        });
    }
});

// ========================================
// 5. Get One Menu Item
// GET /api/menu/:id
// ========================================

app.get("/api/menu/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("menu_items")
            .select("*")
            .eq("id", req.params.id)
            .maybeSingle();

        if (error) {
            console.error("Supabase lookup error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve the menu item."
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found."
            });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Unexpected lookup error:", error.message);

        res.status(500).json({
            success: false,
            message: "An unexpected server error occurred."
        });
    }
});

// ========================================
// 6. Add Menu Item
// POST /api/menu
// ========================================

app.post("/api/menu", async (req, res) => {
    try {
        const errors = validateMenuItem(req.body);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the submitted information.",
                errors
            });
        }

        const payload = createMenuPayload(req.body);

        const { data, error } = await supabase
            .from("menu_items")
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to add the menu item."
            });
        }

        res.status(201).json({
            success: true,
            message: "Menu item added successfully.",
            data
        });
    } catch (error) {
        console.error("Unexpected insert error:", error.message);

        res.status(500).json({
            success: false,
            message: "An unexpected server error occurred."
        });
    }
});

// ========================================
// 7. Update Menu Item
// PUT /api/menu/:id
// ========================================

app.put("/api/menu/:id", async (req, res) => {
    try {
        const errors = validateMenuItem(req.body);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the submitted information.",
                errors
            });
        }

        const payload = createMenuPayload(req.body);

        const { data, error } = await supabase
            .from("menu_items")
            .update(payload)
            .eq("id", req.params.id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Supabase update error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to update the menu item."
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found."
            });
        }

        res.json({
            success: true,
            message: "Menu item updated successfully.",
            data
        });
    } catch (error) {
        console.error("Unexpected update error:", error.message);

        res.status(500).json({
            success: false,
            message: "An unexpected server error occurred."
        });
    }
});

// ========================================
// 8. Delete Menu Item
// DELETE /api/menu/:id
// ========================================

app.delete("/api/menu/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("menu_items")
            .delete()
            .eq("id", req.params.id)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Supabase delete error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Unable to delete the menu item."
            });
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found."
            });
        }

        res.json({
            success: true,
            message: "Menu item deleted successfully."
        });
    } catch (error) {
        console.error("Unexpected delete error:", error.message);

        res.status(500).json({
            success: false,
            message: "An unexpected server error occurred."
        });
    }
});

// ========================================
// 9. Handle Unknown Routes
// ========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// ========================================
// 10. Start Server
// ========================================

app.listen(PORT, () => {
    console.log(`Smart Canteen Menu server running at http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Menu API: http://localhost:${PORT}/api/menu`);
});
