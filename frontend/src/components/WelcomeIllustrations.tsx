import { View } from 'react-native';

export function HumanIllustration() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8, gap: 10 }}>
      <WomanFigure />
      <ManFigure />
    </View>
  );
}

export function PetIllustration() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8, gap: 6 }}>
      <CatFigure />
      <DogFigure />
    </View>
  );
}

// ─── Woman ────────────────────────────────────────────────────────────────────

function WomanFigure() {
  return (
    <View style={{ alignItems: 'center', width: 52 }}>
      {/* Long hair behind head */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: 40,
          height: 56,
          backgroundColor: '#5D3A1A',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }}
      />
      {/* Head */}
      <View
        style={{
          width: 34,
          height: 36,
          borderRadius: 17,
          backgroundColor: '#FDBCB4',
          marginTop: 6,
          zIndex: 1,
        }}
      />
      {/* Neck */}
      <View style={{ width: 10, height: 8, backgroundColor: '#FDBCB4', zIndex: 1 }} />
      {/* Scrubs / body */}
      <View
        style={{
          width: 46,
          height: 38,
          backgroundColor: '#0DB09E',
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 8,
          zIndex: 1,
        }}
      >
        {/* White collar */}
        <View
          style={{
            width: 18,
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderRadius: 3,
          }}
        />
      </View>
      {/* Hair side strands */}
      <View
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          width: 7,
          height: 22,
          backgroundColor: '#5D3A1A',
          borderRadius: 4,
          zIndex: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 40,
          right: 0,
          width: 7,
          height: 22,
          backgroundColor: '#5D3A1A',
          borderRadius: 4,
          zIndex: 0,
        }}
      />
    </View>
  );
}

// ─── Man ──────────────────────────────────────────────────────────────────────

function ManFigure() {
  return (
    <View style={{ alignItems: 'center', width: 50 }}>
      {/* Hair cap */}
      <View
        style={{
          width: 36,
          height: 16,
          backgroundColor: '#2C1A10',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
        }}
      />
      {/* Head */}
      <View
        style={{
          width: 34,
          height: 36,
          borderRadius: 17,
          backgroundColor: '#C68B6A',
          marginTop: -8,
          zIndex: 1,
        }}
      />
      {/* Neck */}
      <View style={{ width: 10, height: 8, backgroundColor: '#C68B6A', zIndex: 1 }} />
      {/* Body / shirt */}
      <View
        style={{
          width: 46,
          height: 38,
          backgroundColor: '#1C6EA4',
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 8,
        }}
      >
        {/* Collar */}
        <View
          style={{
            width: 16,
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.6)',
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

// ─── Cat ──────────────────────────────────────────────────────────────────────

function CatFigure() {
  const FUR = '#9B9B9B';
  const FUR_LIGHT = '#C0C0C0';
  return (
    <View style={{ alignItems: 'center', width: 54 }}>
      {/* Ears (triangles via border trick) */}
      <View style={{ flexDirection: 'row', width: 40, justifyContent: 'space-between', zIndex: 1 }}>
        <CatEar color={FUR} />
        <CatEar color={FUR} />
      </View>
      {/* Head */}
      <View
        style={{
          width: 44,
          height: 40,
          borderRadius: 22,
          backgroundColor: FUR,
          marginTop: -6,
          zIndex: 1,
          alignItems: 'center',
        }}
      >
        {/* Eyes */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 13, paddingHorizontal: 8 }}>
          <View style={{ width: 9, height: 7, borderRadius: 4, backgroundColor: '#2A6E00' }} />
          <View style={{ width: 9, height: 7, borderRadius: 4, backgroundColor: '#2A6E00' }} />
        </View>
        {/* Nose */}
        <View style={{ width: 7, height: 5, backgroundColor: '#FFB6C1', borderRadius: 3, marginTop: 3 }} />
        {/* Whiskers */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 40, marginTop: 1 }}>
          <View style={{ width: 12, height: 1.5, backgroundColor: '#555', borderRadius: 1 }} />
          <View style={{ width: 12, height: 1.5, backgroundColor: '#555', borderRadius: 1 }} />
        </View>
      </View>
      {/* Body */}
      <View
        style={{
          width: 50,
          height: 36,
          backgroundColor: FUR,
          borderRadius: 18,
          marginTop: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Belly patch */}
        <View style={{ width: 24, height: 22, backgroundColor: FUR_LIGHT, borderRadius: 12 }} />
      </View>
      {/* Tail hint */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 8,
          height: 28,
          backgroundColor: FUR,
          borderRadius: 4,
          transform: [{ rotate: '20deg' }],
        }}
      />
    </View>
  );
}

function CatEar({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 9,
        borderRightWidth: 9,
        borderBottomWidth: 18,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

// ─── Dog ──────────────────────────────────────────────────────────────────────

function DogFigure() {
  const FUR = '#D4900A';
  const FUR_DARK = '#A86D08';
  const SNOUT = '#E8B84B';
  return (
    <View style={{ alignItems: 'center', width: 60 }}>
      {/* Floppy ears (behind head) */}
      <View
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          width: 16,
          height: 34,
          backgroundColor: FUR_DARK,
          borderRadius: 8,
          zIndex: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 8,
          right: 0,
          width: 16,
          height: 34,
          backgroundColor: FUR_DARK,
          borderRadius: 8,
          zIndex: 0,
        }}
      />
      {/* Head */}
      <View
        style={{
          width: 46,
          height: 44,
          borderRadius: 23,
          backgroundColor: FUR,
          zIndex: 1,
          alignItems: 'center',
        }}
      >
        {/* Eyes */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 12, paddingHorizontal: 8 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#1A0E00' }} />
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#1A0E00' }} />
        </View>
        {/* Snout area */}
        <View
          style={{
            width: 26,
            height: 16,
            backgroundColor: SNOUT,
            borderRadius: 13,
            marginTop: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Nose */}
          <View style={{ width: 10, height: 6, backgroundColor: '#1A0E00', borderRadius: 4, marginTop: -4 }} />
        </View>
      </View>
      {/* Body */}
      <View
        style={{
          width: 54,
          height: 36,
          backgroundColor: FUR,
          borderRadius: 20,
          marginTop: 4,
        }}
      />
    </View>
  );
}
