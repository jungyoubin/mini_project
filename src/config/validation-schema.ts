import * as Joi from 'joi';

const ttlPattern = /^[1-9]\d*(s|m|h|d)$/;

export default Joi.object({
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().allow('', null),
  DB_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_TTL: Joi.string().pattern(ttlPattern).default('1h'),
  JWT_REFRESH_TTL: Joi.string().pattern(ttlPattern).default('7d'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  MONGO_URI: Joi.string().required(),
  MONGO_DB_NAME: Joi.string().required(),
  MONGO_DB_MESSAGE_NAME: Joi.string().required(),
});
