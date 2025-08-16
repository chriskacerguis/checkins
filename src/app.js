import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import api from './routes/index.js';
import { security } from './middlewares/security.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp() {
  const app = express();

  // Security + basics
  security(app);
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  // Static assets (JS, CSS, images)
  app.use(express.static(path.join(__dirname, '../public')));

  // View engine: Handlebars with default layout and helpers
  app.engine(
    'hbs',
    engine({
      extname: '.hbs',
      layoutsDir: path.join(__dirname, '../views/layouts'),
      partialsDir: path.join(__dirname, '../views/partials'),
      defaultLayout: 'main',
      helpers: {
        eq: (a, b) => a === b,
        // {{#section "scripts"}} ... {{/section}}
        section(name, options) {
          if (!this._sections) this._sections = {};
          this._sections[name] = options.fn(this);
          return null;
        },
      },
    })
  );
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, '../views'));

  // Pages
  app.get('/', (_req, res) => {
    res.render('index', { title: 'Check-ins — Upload & Browse' });
  });
  app.get('/inactive', (_req, res) => {
    res.render('inactive', { title: 'Inactive Operators (Last-Heard Report)' });
  });
  // Back-compat
  app.get('/inactive.html', (_req, res) => res.redirect(301, '/inactive'));

  // API
  app.use('/api', api);
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Errors
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
