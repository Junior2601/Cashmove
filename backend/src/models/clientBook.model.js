// models/clientBook.model.js
// Carnets du client (cahier V2 · NUM-01 à NUM-03) :
//   - accounts      → client_payment_accounts (mes numéros d'envoi)
//   - beneficiaries → beneficiaries
// Les deux tables ont la même forme, seuls le nom, le libellé et le drapeau changent.
const db = require("../config/db");

const BOOKS = {
  accounts: {
    table: "client_payment_accounts",
    nameColumn: "label",
    flagColumn: "is_default",
    order: "e.is_default DESC, e.created_at ASC",
  },
  beneficiaries: {
    table: "beneficiaries",
    nameColumn: "name",
    flagColumn: "is_favorite",
    order: "e.is_favorite DESC, e.last_used_at DESC NULLS LAST, e.name ASC",
  },
};

const selectSql = (book) => `
  SELECT e.*,
         co.name         AS country_name,
         co.code         AS country_code,
         co.phone_prefix AS phone_prefix,
         pm.method       AS payment_method_name,
         cur.code        AS currency_code,
         cur.symbol      AS currency_symbol
  FROM ${book.table} e
  JOIN countries       co  ON co.id  = e.country_id
  JOIN payment_methods pm  ON pm.id  = e.payment_method_id
  JOIN currencies      cur ON cur.id = pm.currency_id
`;

const ClientBook = (kind) => {
  const book = BOOKS[kind];
  if (!book) throw new Error(`Carnet inconnu : ${kind}`);

  return {
    findAll: async (clientId) => {
      const { rows } = await db.query(
        `${selectSql(book)}
         WHERE e.client_id = $1 AND e.deleted_at IS NULL
         ORDER BY ${book.order}`,
        [clientId]
      );
      return rows;
    },

    findById: async (clientId, id, client = null) => {
      const { rows } = await (client || db).query(
        `${selectSql(book)}
         WHERE e.client_id = $1 AND e.id = $2 AND e.deleted_at IS NULL`,
        [clientId, id]
      );
      return rows[0] || null;
    },

    count: async (clientId) => {
      const { rows } = await db.query(
        `SELECT COUNT(*)::INT AS n FROM ${book.table} WHERE client_id = $1 AND deleted_at IS NULL`,
        [clientId]
      );
      return rows[0].n;
    },

    // data : { name|label, country_id, payment_method_id, phone, flag }
    create: async (clientId, data) => {
      const client = await db.getClient();
      try {
        await client.query("BEGIN");
        if (data.flag && kind === "accounts") {
          await client.query(
            `UPDATE ${book.table} SET is_default = false
             WHERE client_id = $1 AND is_default AND deleted_at IS NULL`,
            [clientId]
          );
        }
        const { rows } = await client.query(
          `INSERT INTO ${book.table}
             (client_id, ${book.nameColumn}, country_id, payment_method_id, phone, ${book.flagColumn})
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [clientId, data.name, data.country_id, data.payment_method_id, data.phone, !!data.flag]
        );
        const created = await ClientBook(kind).findById(clientId, rows[0].id, client);
        await client.query("COMMIT");
        return created;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    update: async (clientId, id, data) => {
      const client = await db.getClient();
      try {
        await client.query("BEGIN");
        if (data.flag === true && kind === "accounts") {
          await client.query(
            `UPDATE ${book.table} SET is_default = false
             WHERE client_id = $1 AND is_default AND id <> $2 AND deleted_at IS NULL`,
            [clientId, id]
          );
        }
        const fields = {
          [book.nameColumn]: data.name,
          country_id: data.country_id,
          payment_method_id: data.payment_method_id,
          phone: data.phone,
          [book.flagColumn]: data.flag,
        };
        const sets = [];
        const values = [];
        for (const [col, value] of Object.entries(fields)) {
          if (value !== undefined) {
            values.push(value);
            sets.push(`${col} = $${values.length}`);
          }
        }
        if (sets.length > 0) {
          values.push(clientId, id);
          await client.query(
            `UPDATE ${book.table} SET ${sets.join(", ")}
             WHERE client_id = $${values.length - 1} AND id = $${values.length} AND deleted_at IS NULL`,
            values
          );
        }
        const updated = await ClientBook(kind).findById(clientId, id, client);
        await client.query("COMMIT");
        return updated;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    remove: async (clientId, id) => {
      const { rowCount } = await db.query(
        `UPDATE ${book.table}
         SET deleted_at = NOW(), ${book.flagColumn} = false
         WHERE client_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [clientId, id]
      );
      return rowCount > 0;
    },

    // Bénéficiaire existant pour ce numéro (NUM-02 : « Enregistrer ce bénéficiaire ? »)
    findByNumber: async (clientId, paymentMethodId, phone) => {
      const { rows } = await db.query(
        `SELECT id FROM ${book.table}
         WHERE client_id = $1 AND payment_method_id = $2 AND phone = $3 AND deleted_at IS NULL`,
        [clientId, paymentMethodId, phone]
      );
      return rows[0] || null;
    },

    touchUsed: async (clientId, paymentMethodId, phone) => {
      if (kind !== "beneficiaries") return;
      await db.query(
        `UPDATE beneficiaries SET last_used_at = NOW()
         WHERE client_id = $1 AND payment_method_id = $2 AND phone = $3 AND deleted_at IS NULL`,
        [clientId, paymentMethodId, phone]
      );
    },
  };
};

module.exports = ClientBook;
