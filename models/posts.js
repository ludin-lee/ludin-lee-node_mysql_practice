'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Posts extends Model {
    static associate(db) {
    }

  }
  Posts.init({
    postId: { 
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    userId: DataTypes.INTEGER,
    nickname: DataTypes.STRING,
    title: DataTypes.STRING,
    content: DataTypes.STRING,
    likes:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Posts',
    charset: 'utf8', 
  })

  return Posts;
};
