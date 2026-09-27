SKILLTRACK MONGODB SERVER FILES

Replace these files in your project:
  server/index.ts      <- this package's server/index.ts
  server/db.ts         <- this package's server/db.ts
  server/auth.ts       <- this package's server/auth.ts
  server/mongoData.ts  <- keep your current version; included here for reference

Keep your existing package.json and frontend files. No dependency additions are needed.



DATABASE BEHAVIOUR
All application data routes use MongoDB collections. The /api/admin/reset endpoint reloads
public/data JSON into the seven operational collections, and preserves users and logs.
Do not call that endpoint unless you intend to replace those seven collections with the
JSON seed files. Existing Atlas data is not modified by simply starting the server.
