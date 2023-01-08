"use strict";
const { Model,Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
  
    static associate(models) {
      // define association here
      Todo.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }

    static addTodo({ title, dueDate,userId }) {
      return this.create({ title: title, dueDate: dueDate, completed: false,userId,});
    }
    static getTodos(userId) {
      return this.findAll({ order: [["id", "ASC"]],where: {userId,}, });
    }
    static overdue(userId) {
      return this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date().toLocaleDateString("en-CA"),
          },
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    static dueToday(userId) {
      return this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date().toLocaleDateString("en-CA"),
          },
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    static dueLater(userId) {
      return this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date().toLocaleDateString("en-CA"),
          },
          completed: false,
        },
        order: [["id", "ASC"]],
      });
    }
    static completedItems(userId) {
      return this.findAll({
        where: {
          completed: true,
        },
        order: [["id", "ASC"]],
      });
    }

    removeTodo(userId) {
      if (this.userId === userId) {
        return this.destroy();
      } else {
        throw new Error("Unauthorized");
      }
    }

    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
    setCompletionStatus(completed, userId) {
      if (this.userId === userId) {
        return this.update({
          completed,
        });
      } else {
        throw new Error("Unauthorized");
      }
    }
  }
  Todo.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Title is required",
          },
          notEmpty: {
            msg: "Title is required",
          },
        },
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notNull: {
            msg: "Due date is required",
          },
          notEmpty: {
            msg: "Due date is required",
          },
        },
      },
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};