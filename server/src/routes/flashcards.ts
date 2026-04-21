import mongoose from 'mongoose';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth';
import { FlashcardDeckModel } from '../models/FlashcardDeck';
import { FlashcardCardModel } from '../models/FlashcardCard';

const router = Router();

const deckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  moduleId: z.string().optional().nullable(),
});

const cardSchema = z.object({
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(1000),
});

const reviewSchema = z.object({
  rating: z.number().int().min(0).max(5),
});

function sm2(interval: number, easeFactor: number, repetitions: number, rating: number) {
  let newInterval: number;
  let newReps: number;
  let newEase = Math.max(1.3, easeFactor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));

  if (rating >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newReps = repetitions + 1;
  } else {
    newInterval = 1;
    newReps = 0;
    newEase = easeFactor; // don't penalise ease on fail
  }

  const due = new Date();
  due.setDate(due.getDate() + newInterval);

  return { interval: newInterval, easeFactor: newEase, repetitions: newReps, due };
}

// GET /api/flashcards/decks
router.get('/decks', requireAuth, async (req: Request, res: Response) => {
  try {
    const decks = await FlashcardDeckModel.find({ userId: req.user!._id }).sort({ createdAt: -1 });

    const deckIds = decks.map(d => d._id);
    const now = new Date();

    const [cardCounts, dueCounts] = await Promise.all([
      FlashcardCardModel.aggregate([
        { $match: { deckId: { $in: deckIds } } },
        { $group: { _id: '$deckId', count: { $sum: 1 } } },
      ]),
      FlashcardCardModel.aggregate([
        { $match: { deckId: { $in: deckIds }, due: { $lte: now } } },
        { $group: { _id: '$deckId', count: { $sum: 1 } } },
      ]),
    ]);

    const cardCountMap = new Map(cardCounts.map((x: { _id: mongoose.Types.ObjectId; count: number }) => [x._id.toString(), x.count]));
    const dueCountMap = new Map(dueCounts.map((x: { _id: mongoose.Types.ObjectId; count: number }) => [x._id.toString(), x.count]));

    const result = decks.map(d => ({
      _id: d._id,
      name: d.name,
      description: d.description,
      moduleId: d.moduleId,
      cardCount: cardCountMap.get(d._id.toString()) ?? 0,
      dueCount: dueCountMap.get(d._id.toString()) ?? 0,
      createdAt: d.createdAt,
    }));

    return res.json({ decks: result });
  } catch (err) {
    console.error('Get decks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/flashcards/decks
router.post('/decks', requireAuth, async (req: Request, res: Response) => {
  const parsed = deckSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });

  try {
    const deck = await FlashcardDeckModel.create({
      userId: req.user!._id,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      moduleId: parsed.data.moduleId ?? null,
    });
    return res.status(201).json({ deck });
  } catch (err) {
    console.error('Create deck error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/flashcards/decks/:id
router.delete('/decks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const deck = await FlashcardDeckModel.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!deck) return res.status(404).json({ error: 'Deck not found' });
    await FlashcardCardModel.deleteMany({ deckId: req.params.id });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('Delete deck error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/flashcards/decks/:deckId/cards
router.get('/decks/:deckId/cards', requireAuth, async (req: Request, res: Response) => {
  try {
    const deck = await FlashcardDeckModel.findOne({ _id: req.params.deckId, userId: req.user!._id });
    if (!deck) return res.status(404).json({ error: 'Deck not found' });
    const cards = await FlashcardCardModel.find({ deckId: req.params.deckId }).sort({ createdAt: 1 });
    return res.json({ cards });
  } catch (err) {
    console.error('Get cards error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/flashcards/decks/:deckId/cards
router.post('/decks/:deckId/cards', requireAuth, async (req: Request, res: Response) => {
  const parsed = cardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });

  try {
    const deck = await FlashcardDeckModel.findOne({ _id: req.params.deckId, userId: req.user!._id });
    if (!deck) return res.status(404).json({ error: 'Deck not found' });
    const card = await FlashcardCardModel.create({
      deckId: req.params.deckId,
      userId: req.user!._id,
      front: parsed.data.front,
      back: parsed.data.back,
    });
    return res.status(201).json({ card });
  } catch (err) {
    console.error('Create card error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/flashcards/cards/:id
router.delete('/cards/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const card = await FlashcardCardModel.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('Delete card error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/flashcards/cards/:id/review
router.post('/cards/:id/review', requireAuth, async (req: Request, res: Response) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Rating must be 0–5' });

  try {
    const card = await FlashcardCardModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const { interval, easeFactor, repetitions, due } = sm2(
      card.interval, card.easeFactor, card.repetitions, parsed.data.rating
    );
    card.interval = interval;
    card.easeFactor = easeFactor;
    card.repetitions = repetitions;
    card.due = due;
    await card.save();
    return res.json({ card });
  } catch (err) {
    console.error('Review card error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/flashcards/due  — cards due across all decks
router.get('/due', requireAuth, async (req: Request, res: Response) => {
  try {
    const cards = await FlashcardCardModel.find({ userId: req.user!._id, due: { $lte: new Date() } })
      .sort({ due: 1 })
      .limit(50);
    return res.json({ cards });
  } catch (err) {
    console.error('Due cards error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
