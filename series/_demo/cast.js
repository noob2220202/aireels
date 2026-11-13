/* series/_demo/cast.js: cast of the engine demo reel.
 * NOTE: the definition fields below are the ones the placeholder kit (engine/toon_stub.js) reads;
 * when the real kit lands, adapt them to its defineCharacter() format (ids stay sora / jun). */
TOON.defineCharacter('sora', {
  name: '서아', body: 'f', age: 27, skin: '#ffe4d6', eyes: '#6a4a3c',
  hair: { style: 'long', color: '#6b4636' },
  outfits: { default: { top: '#f8c8d4', bottom: '#6f7fb8', style: 'skirt' }, home: { top: '#fff1c9', bottom: '#b9c4e6', style: 'pants' } }
});
TOON.defineCharacter('jun', {
  name: '준', body: 'm', age: 29, skin: '#f7d9c4', eyes: '#3d3a4a',
  hair: { style: 'short', color: '#2c2a36' },
  outfits: { default: { top: '#9db8d9', bottom: '#3d4662' } }
});
