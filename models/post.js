"use strict";

module.exports = function(sequelize, DataTypes) {
  var Post = sequelize.define("Post", {
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    image_url: DataTypes.STRING,
    UserId: DataTypes.INTEGER,
    location: DataTypes.STRING,
    WinnerId: DataTypes.INTEGER,
    hasWon: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    classMethods: {
      associate: function(db) {
        // associations can be defined here
        Post.belongsTo(db.User);
        Post.hasMany(db.PostsUsers);
      }
    }
  });

  return Post;
};
