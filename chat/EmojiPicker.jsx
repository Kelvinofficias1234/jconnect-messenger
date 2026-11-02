import React, { useState } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = {
  Smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😋','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','😱','😨','😰','😥','😓','🤗','🤔','🤭','😶','😐','😑','😬','🙄','😯','😦','😮','😲','😴','🤤','😵','🤢','🤮','🤧','😷','🤒','🤕'],
  Gestures: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','✋','🖖','👏','🙌','🤝','🙏','💪','✍️','🤚','🖐️','🖕'],
  Hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💌'],
  Party: ['🎉','🎊','🎈','🎁','🎂','🍰','🧁','🏆','🥇','🥈','🥉','👑','💎','🔥','✨','⭐','🌟','💫','💥','💯','🎊','🎈'],
  Animals: ['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦄','🐝','🦋','🐢','🐬','🐳','🦕','🦖','🦒','🦓','🐘','🦏','🦘'],
  Food: ['🍎','🍊','🍌','🍉','🍇','🍓','🫐','🍑','🍒','🥭','🍍','🥥','🍅','🥑','🥦','🌽','🍔','🍕','🌭','🥪','🌮','🌯','🍜','🍣','🍱','🍦','🍩','🍪','🍫','🍬','☕','🍺','🍷','🥂','🍻'],
  Travel: ['🚗','✈️','🚀','🛸','🏠','🏢','🌍','🌎','🌏','🗺️','🧭','🏖️','🏔️','🌋','🏕️','⛺','🌉','🌃','🌅','🌄','🎡','🎢','🎠','🏖️','🚲','🛵'],
  Objects: ['📱','💻','🖥️','💡','🔔','🔕','📷','📸','🎥','🎬','🎵','🎶','🎤','🎧','📻','📚','✏️','📝','📅','📌','📎','🔗','💰','⏰','🔑','🔒','🔓','⚽','🏀','🏈','⚾','🎾','🎮','🎲']
};

const TAB_ICONS = ['😀','👍','❤️','🎉','🐶','🍎','✈️','📱'];

export default function EmojiPicker({ onSelect, onClose }) {
  const [active, setActive] = useState('Smileys');
  const emojis = CATEGORIES[active] || [];

  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ backgroundColor: '#1e2140' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {Object.keys(CATEGORIES).map((cat, i) => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all shrink-0 ${active === cat ? 'bg-purple-600/30 scale-110' : 'hover:bg-white/10'}`}>
              {TAB_ICONS[i]}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white p-1">
          <X size={16} />
        </button>
      </div>
      <div className="p-2 max-h-48 overflow-y-auto scrollbar-hide grid grid-cols-8 gap-0.5">
        {emojis.map((emoji, i) => (
          <button key={`${emoji}-${i}`} onClick={() => onSelect(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}