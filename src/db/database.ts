import { Pool } from 'pg';
import { Cart, CartItem, Product } from 'src/cart';
import { v4 as uuidv4 } from 'uuid';

export class Database {
    private static instance: Database;

    private pool: Pool;

    private constructor() {
        this.pool = new Pool({
            ssl: { rejectUnauthorized: false }
        });
        this.pool.on('error', (err, _) => {
            console.error('Error:', err);
        });
    }

    private async query<T>(query: string, values: any[]): Promise<any> {
        const client = await this.pool.connect();
        try {
          const result = await client.query<T>(query, values);
          return result;
        } finally {
          client.release();
        }
    }

    private PRODUCTS: Product[] = [
        {
            id: '00000000-0000-0000-0000-000000000001',
            title: 'Product 1',
            description: 'Product 1 description',
            price: 10.99,
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            title: 'Product 2',
            description: 'Product 2 description',
            price: 19.99,
        }
    ];

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async getActiveCartForUser(userId: string): Promise<Cart> {
        const cartQuery = `
          SELECT id, created_at, updated_at, status
          FROM carts
          WHERE user_id = $1
            AND status = 'active';
        `;
        const cartValues = [userId];

        const { rows } = await this.query(cartQuery, cartValues);

        if (rows.length === 0) {
            // no active cart found for user
            return null;
        }

        const cart = rows[0];

        const itemsQuery = `
          SELECT ci.count, ci.product_id
          FROM cart_items ci
          WHERE ci.cart_id = $1;
        `;
        const itemsValues = [cart.id];
        const itemsResult = await this.query(itemsQuery, itemsValues);

        const items = itemsResult.rows.map((row) => {
            const product = this.PRODUCTS.find(p => p.id === row.product_id);
            return {
                product: {
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                },
                count: row.count,
            }
        });

        return {
            id: cart.id,
            items: items,
        };
    }

    public async createEmptyCartForUser(userId: string): Promise<Cart> {
        const query = `
    INSERT INTO carts (id, user_id, created_at, updated_at, status)
    VALUES ($1, $2, NOW(), NOW(), 'active')
  `;
        const cartId = uuidv4();
        const values = [uuidv4(), userId];
        await this.query(query, values);
        return {
            id: cartId,
            items: [],
        };
    }

    public async deleteActiveCartForUser(userId: string): Promise<void> {
        const updateQuery = `
          UPDATE carts SET status = 'inactive' 
          WHERE user_id = $1 AND status = 'active';
        `;
        const values = [userId];

        await this.query(updateQuery, values);
    }

    public async checkoutActiveCartForUser(userId: string, body: any): Promise<any> {
        const activeCart = await this.getActiveCartForUser(userId);
        const totalPrice = activeCart.items.reduce((total, item) => {
            const product = this.PRODUCTS.find((p) => p.id === item.product.id);
            return total + product.price * item.count;
        }, 0);

        const order = {
            id: uuidv4(),
            user_id: userId,
            cart_id: activeCart.id,
            payment: {method: body.method},
            delivery: {address: body.address},
            comments: "",
            status: "ordered",
            total: totalPrice
        };

        const insertQuery = `
        INSERT INTO orders (id, user_id, cart_id, payment, delivery, comments, status, total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
        const insertValues = [
            order.id,
            order.user_id,
            order.cart_id,
            order.payment,
            order.delivery,
            order.comments,
            order.status,
            order.total
        ];
        await this.query(insertQuery, insertValues);

        const updateQuery = `
          UPDATE carts SET status = 'ordered'
          WHERE id = $1;
        `;
        const updateValues = [activeCart.id];
        await this.query(updateQuery, updateValues);
        return order;
    }


    public async updateUserCartItems(userId: string, cartItems: CartItem[]): Promise<Cart> {
        // Check that all product IDs are valid
        const invalidProductIds = cartItems.filter((item) => !this.PRODUCTS.some((product) => product.id === item.product.id));
        if (invalidProductIds.length > 0) {
            throw new Error(`Invalid product IDs: ${invalidProductIds.map((item) => item.product.id).join(', ')}`);
        }

        // Create a new active cart if one doesn't exist
        let activeCart = await this.getActiveCartForUser(userId);
        if (!activeCart) {
            activeCart = await this.createEmptyCartForUser(userId)
        }

        // Delete existing cart items
        const deleteQuery = 'DELETE FROM cart_items WHERE cart_id = $1';
        const deleteParams = [activeCart.id];
        await this.query(deleteQuery, deleteParams);

        // Insert new cart items
        const insertQuery = `
            INSERT INTO cart_items (cart_id, product_id, count)
            VALUES ($1, $2, $3);
        `;
        for (const item of cartItems) {
            const insertValues = [activeCart.id, item.product.id, item.count];
            await this.query(insertQuery, insertValues);
        }

        // Get the updated cart object
        const cart = await this.getActiveCartForUser(userId);

        return cart;
    }
}
