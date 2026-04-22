import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDecks, useCards, useCreateDeck, useDeleteDeck, useCreateCard, useDeleteCard, useReviewCard } from '../hooks/useFlashcards';
import type { FlashcardCard, FlashcardDeck } from '@studybuddy/shared';

// ── Review Mode ───────────────────────────────────────────────────────────────

const RATINGS = [
  { value: 0, label: 'Again', colour: 'bg-red-500 hover:bg-red-600' },
  { value: 3, label: 'Hard',  colour: 'bg-amber-500 hover:bg-amber-600' },
  { value: 4, label: 'Good',  colour: 'bg-blue-500 hover:bg-blue-600' },
  { value: 5, label: 'Easy',  colour: 'bg-emerald-500 hover:bg-emerald-600' },
];

function ReviewMode({ cards, onDone }: { cards: FlashcardCard[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const reviewCard = useReviewCard();

  const card = cards[index];
  if (!card || reviewed === cards.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-xl font-bold text-slate-800">Session complete!</h2>
        <p className="text-slate-500">You reviewed {reviewed} card{reviewed !== 1 ? 's' : ''}.</p>
        <button onClick={onDone} className="btn-primary px-6 py-2">Back to decks</button>
      </div>
    );
  }

  function handleRating(rating: number) {
    reviewCard.mutate({ id: card._id, rating });
    setReviewed(r => r + 1);
    setIndex(i => i + 1);
    setFlipped(false);
  }

  const dueDate = new Date(card.due);
  const _isOverdue = dueDate < new Date();

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onDone} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          ← Exit
        </button>
        <p className="text-sm text-slate-500">{index + 1} / {cards.length}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${(index / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div
        className="card-base p-8 min-h-[220px] flex flex-col items-center justify-center cursor-pointer select-none mb-4"
        onClick={() => setFlipped(v => !v)}
      >
        <div className="text-center">
          {!flipped ? (
            <>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Question</p>
              <p className="text-lg font-medium text-slate-800 whitespace-pre-wrap">{card.front}</p>
              <p className="text-xs text-slate-400 mt-6">Click to reveal answer</p>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Answer</p>
              <p className="text-lg font-medium text-slate-800 whitespace-pre-wrap">{card.back}</p>
            </>
          )}
        </div>
      </div>

      {/* Rating buttons — only shown when flipped */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(r => (
            <button
              key={r.value}
              onClick={() => handleRating(r.value)}
              className={`py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${r.colour}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {!flipped && (
        <p className="text-center text-xs text-slate-400">Tap card or press Space to flip</p>
      )}
    </div>
  );
}

// ── Card Manager ──────────────────────────────────────────────────────────────

function CardManager({ deck, onBack }: { deck: FlashcardDeck; onBack: () => void }) {
  const { data: cards = [], isLoading } = useCards(deck._id);
  const createCard = useCreateCard(deck._id);
  const deleteCard = useDeleteCard(deck._id);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const dueCards = cards.filter(c => new Date(c.due) <= new Date());

  if (reviewing) {
    return <ReviewMode cards={dueCards.length > 0 ? dueCards : cards} onDone={() => setReviewing(false)} />;
  }

  function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    createCard.mutate({ front: front.trim(), back: back.trim() }, {
      onSuccess: () => { setFront(''); setBack(''); },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-slate-800">{deck.name}</h2>
        </div>
        {cards.length > 0 && (
          <button onClick={() => setReviewing(true)} className="btn-primary px-4 py-2 text-sm">
            Study {dueCards.length > 0 ? `(${dueCards.length} due)` : 'all'}
          </button>
        )}
      </div>

      {/* Add card form */}
      <div className="card-base p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Add card</h3>
        <form onSubmit={handleAddCard} className="space-y-2">
          <textarea
            className="input w-full resize-none text-sm"
            placeholder="Front (question)"
            rows={2}
            value={front}
            onChange={e => setFront(e.target.value)}
          />
          <textarea
            className="input w-full resize-none text-sm"
            placeholder="Back (answer)"
            rows={2}
            value={back}
            onChange={e => setBack(e.target.value)}
          />
          <button
            type="submit"
            disabled={!front.trim() || !back.trim() || createCard.isPending}
            className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
          >
            Add card
          </button>
        </form>
      </div>

      {/* Card list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="card-base p-8 text-center text-slate-400 text-sm">
          No cards yet. Add your first card above.
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => {
            const isDue = new Date(card.due) <= new Date();
            return (
              <div key={card._id} className="card-base p-4 flex gap-4">
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Front</p>
                    <p className="text-sm text-slate-700 line-clamp-2">{card.front}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Back</p>
                    <p className="text-sm text-slate-700 line-clamp-2">{card.back}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDue ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isDue ? 'Due' : `In ${Math.ceil((new Date(card.due).getTime() - Date.now()) / 86400000)}d`}
                  </span>
                  <button
                    onClick={() => deleteCard.mutate(card._id)}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Delete card"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Deck List ─────────────────────────────────────────────────────────────────

export function FlashcardsPage() {
  const { data: decks = [], isLoading } = useDecks();
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);

  if (selectedDeck) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <CardManager deck={selectedDeck} onBack={() => setSelectedDeck(null)} />
        </div>
      </div>
    );
  }

  const totalDue = decks.reduce((s, d) => s + d.dueCount, 0);

  function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    createDeck.mutate({ name: newDeckName.trim() }, {
      onSuccess: () => { setNewDeckName(''); setShowNewDeck(false); },
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Flashcards</h1>
            {totalDue > 0 && (
              <p className="text-sm text-amber-600 mt-0.5">{totalDue} card{totalDue !== 1 ? 's' : ''} due for review</p>
            )}
          </div>
          <button
            onClick={() => setShowNewDeck(v => !v)}
            className="btn-primary px-4 py-2 text-sm"
          >
            New deck
          </button>
        </div>

        {showNewDeck && (
          <form onSubmit={handleCreateDeck} className="card-base p-4 mb-4 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Deck name"
              value={newDeckName}
              onChange={e => setNewDeckName(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={!newDeckName.trim() || createDeck.isPending} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              Create
            </button>
            <button type="button" onClick={() => setShowNewDeck(false)} className="btn-secondary px-3 py-2 text-sm">
              Cancel
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
          </div>
        ) : decks.length === 0 ? (
          <div className="card-base p-10 text-center">
            <p className="text-slate-600 font-medium mb-1">No decks yet</p>
            <p className="text-sm text-slate-400">Create a deck to start building your flashcard collection.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map(deck => (
              <div
                key={deck._id}
                className="card-base p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedDeck(deck)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{deck.name}</p>
                  {deck.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{deck.description}</p>}
                  <div className="flex gap-3 mt-1.5">
                    <span className="text-xs text-slate-500">{deck.cardCount} card{deck.cardCount !== 1 ? 's' : ''}</span>
                    {deck.dueCount > 0 && (
                      <span className="text-xs text-amber-600 font-medium">{deck.dueCount} due</span>
                    )}
                    {deck.dueCount === 0 && deck.cardCount > 0 && (
                      <span className="text-xs text-emerald-600">Up to date</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteDeck.mutate(deck._id); }}
                  className="text-slate-300 hover:text-red-400 transition-colors p-1 shrink-0"
                  title="Delete deck"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
