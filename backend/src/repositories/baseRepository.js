'use strict';

const { getDb } = require('../db/couch');
const { id: genId } = require('../utils/ids');
const { NotFound, Conflict } = require('../utils/errors');

class BaseRepository {
  constructor({ dbName, type, idPrefix }) {
    this.dbName = dbName;
    this.type = type;
    this.idPrefix = idPrefix;
  }

  db() {
    return getDb(this.dbName);
  }

  async create(doc) {
    const now = new Date().toISOString();
    const _id = doc._id || genId(this.idPrefix);
    const payload = {
      _id,
      type: this.type,
      createdAt: now,
      updatedAt: now,
      ...doc,
    };
    const res = await this.db().insert(payload);
    return { ...payload, _rev: res.rev };
  }

  async getById(id) {
    try {
      const doc = await this.db().get(id);
      if (doc.type !== this.type) throw NotFound();
      return doc;
    } catch (err) {
      if (err.statusCode === 404) throw NotFound(`${this.type} ${id} no encontrado`);
      throw err;
    }
  }

  async findById(id) {
    try {
      const doc = await this.db().get(id);
      if (doc.type !== this.type) return null;
      return doc;
    } catch (err) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async update(id, patch) {
    const current = await this.getById(id);
    const updated = {
      ...current,
      ...patch,
      _id: current._id,
      _rev: current._rev,
      type: this.type,
      updatedAt: new Date().toISOString(),
    };
    try {
      const res = await this.db().insert(updated);
      return { ...updated, _rev: res.rev };
    } catch (err) {
      if (err.statusCode === 409) throw Conflict('Conflicto de revisión, reintentar');
      throw err;
    }
  }

  async remove(id) {
    const doc = await this.getById(id);
    await this.db().destroy(doc._id, doc._rev);
    return true;
  }

  async find(selector, options = {}) {
    const query = {
      selector: { type: this.type, ...selector },
      limit: options.limit || 50,
      skip: options.skip || 0,
    };
    if (options.sort) query.sort = options.sort;
    if (options.fields) query.fields = options.fields;
    const res = await this.db().find(query);
    return res.docs;
  }

  async findOne(selector) {
    const docs = await this.find(selector, { limit: 1 });
    return docs[0] || null;
  }

  async count(selector = {}) {
    const docs = await this.find(selector, { limit: 10000, fields: ['_id'] });
    return docs.length;
  }
}

module.exports = BaseRepository;
