import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { signToken } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1).default(''),
    }).parse(req.body);

    if (await User.findOne({ email })) {
      res.status(409).json({ error: 'Email già registrata' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name });

    const token = signToken({ sub: String(user._id), email: user.email, name: user.name });
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await User.findOne({ email });
    if (!user?.passwordHash) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Credenziali non valide' });
      return;
    }

    const token = signToken({ sub: String(user._id), email: user.email, name: user.name });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/google  — riceve l'access_token Google, verifica con Google, crea/trova utente
router.post('/google', async (req, res, next) => {
  try {
    const { accessToken } = z.object({ accessToken: z.string() }).parse(req.body);

    // Verifica il token con Google e ottieni info utente
    const gRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!gRes.ok) {
      res.status(401).json({ error: 'Token Google non valido' });
      return;
    }
    const gUser = await gRes.json() as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (!gUser.email) {
      res.status(401).json({ error: 'Email non disponibile da Google' });
      return;
    }

    // Trova o crea utente
    let user = await User.findOne({ $or: [{ googleId: gUser.sub }, { email: gUser.email }] });
    if (!user) {
      user = await User.create({
        email: gUser.email,
        googleId: gUser.sub,
        name: gUser.name ?? '',
        picture: gUser.picture,
      });
    } else if (!user.googleId) {
      user.googleId = gUser.sub;
      if (gUser.picture) user.picture = gUser.picture;
      await user.save();
    }

    const token = signToken({ sub: String(user._id), email: user.email, name: user.name });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, picture: user.picture } });
  } catch (e) {
    next(e);
  }
});

// GET /api/auth/me — ritorna l'utente dal token JWT
router.get('/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // requireUser non è usato qui per evitare import circolare — lo facciamo inline
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(header.slice(7), config.jwt.secret) as { sub: string };
    const user = await User.findById(payload.sub).lean();
    if (!user) {
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }
    res.json({ id: user._id, email: user.email, name: user.name, picture: user.picture });
  } catch (e) {
    next(e);
  }
});

export default router;
