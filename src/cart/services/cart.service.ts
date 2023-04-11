import { Injectable } from '@nestjs/common';
import { Database } from 'src/db/database';

import { v4 } from 'uuid';

import { Cart } from '../models';

@Injectable()
export class CartService {
  private database = Database.getInstance()

  async findByUserId(userId: string): Promise<Cart> {
    return await this.database.getActiveCartForUser(userId)
  }

  async createByUserId(userId: string): Promise<Cart> {
    return await this.database.createEmptyCartForUser(userId)
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, { items }: Cart): Promise<Cart> {
    return await this.database.updateUserCartItems(userId, items);
  }

  async removeByUserId(userId) {
    await this.database.deleteActiveCartForUser(userId)
  }
}
