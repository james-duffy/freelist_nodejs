"use strict";

module.exports = function(sequelize, DataTypes) {
  var PostsUsers = sequelize.define("PostsUsers", {
    PostId: DataTypes.INTEGER,
    UserId: DataTypes.INTEGER,
    isLiked: DataTypes.BOOLEAN
  }, {
    classMethods: {
      associate: function(db) {
        PostsUsers.belongsTo(db.Post);
        PostsUsers.belongsTo(db.User);
      }
    }
  });

  return PostsUsers;
};
