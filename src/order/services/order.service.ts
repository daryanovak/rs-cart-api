import { Injectable } from '@nestjs/common';
import { Database } from 'src/db/database';
import { v4 } from 'uuid';

import { Order } from '../models';

@Injectable()
export class OrderService {

  private database = Database.getInstance()

  create(userId: string, body: any) {
    this.database.checkoutActiveCartForUser(userId, body)
  }
}
