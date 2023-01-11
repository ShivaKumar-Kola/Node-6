'use strict';
const {
  Model, Op
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    static associate(models) {
      Todo.belongsTo(models.User,{
        foreignKey: 'userId'
      })
    }

    static addTodo({ title, dueDate, userId}) {
      return this.create({ title: title, dueDate: dueDate, completed: false, userId});
    }

    static getTodos(userId) {
      return this.findAll({
        order: [["id", "ASC"]],
        where: {
          userId,
        },
      });
    }

    static async overdue(userId) {
      return await Todo.findAll({
        where: {
          dueDate: { [Op.lt]: new Date().toLocaleDateString("en-CA") },
          userId,
          completed: false,
        },
      });
    }

    static async dueToday(userId) {
      return await Todo.findAll({
        where: {
          dueDate: { [Op.eq]: new Date().toLocaleDateString("en-CA") },
          userId,
          completed: false,
        },
      });
    }

    static async dueLater(userId) {
      return await Todo.findAll({
        where: {
          dueDate: { [Op.gt]: new Date().toLocaleDateString("en-CA") },
          userId,
          completed: false,
        },
      });
    }

    static async remove(id, userId) {
      return this.destroy({
        where: {
          id,
          userId,
        }
      })
    }

    static async completedItems(userId) {
      return this.findAll({
        where: {
          completed: true,
          userId,
        }
      })
    }
    setCompletionStatus(receiver) {
      return this.update({ completed: receiver });
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
