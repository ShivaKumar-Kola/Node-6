'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {

    static associate(models) {
      User.hasMany(models.Todo, {
        foreignKey: 'userId'
      })

    }

    static createUser({ firstName, lastName, email, password }) {
      return this.create({ firstName, lastName, email, password });
    }
  }
  User.init(
    {
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "First name is required",
          },
          notEmpty: {
            msg: "First name is required",
          },
        },
      },
      lastName: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Email is required",
          },
          notEmpty: {
            msg: "Email is required",
          },
        },
      },
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
