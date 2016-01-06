"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("PostsUsers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      PostId: {
        type: DataTypes.INTEGER,
        foreignKey: true
      },
      UserId: {
        type: DataTypes.INTEGER,
        foreignKey: true
      },
      isLiked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }).done(done);
  },
  down: function(migration, DataTypes, done) {
    migration.dropTable("PostsUsers").done(done);
  }
};