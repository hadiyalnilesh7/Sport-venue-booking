const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const webRoutes = require('./routes/routes');
const { attachCurrentUser, injectFlashMessages } = require('./middlewares/authMiddleware');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorMiddleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'partials/layout');

app.use(expressLayouts);
// app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined', {
//   skip: (_req, res) => res.statusCode < 400
// }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: env.mongodbUri }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(injectFlashMessages);
app.use(attachCurrentUser);
app.use((req, res, next) => {
  res.locals.appName = env.appName;
  res.locals.currentUrl = req.originalUrl;
  next();
});

// Set timeout for requests (45 seconds for Vercel's 60-second limit)
app.use((req, res, next) => {
  req.setTimeout(45000);
  res.setTimeout(45000);
  next();
});

app.use('/', webRoutes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;