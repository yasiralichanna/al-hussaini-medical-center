import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const clinicState=sqliteTable('clinic_state',{id:text('id').primaryKey(),revision:integer('revision').notNull(),data:text('data').notNull()});
