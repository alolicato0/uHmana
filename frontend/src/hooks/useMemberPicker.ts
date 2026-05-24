import { useCallback, useRef, useState } from 'react';
import { useMembersStore, type MemberKind } from '../store/members';

export interface PickResult {
  /** id chosen (or null if user cancelled the multi-pick) */
  id: string | null;
  /** true if the picker was actually shown (user had to choose) */
  prompted: boolean;
}

export function useMemberPicker(kind: MemberKind) {
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((r: PickResult) => void) | null>(null);

  const pickMember = useCallback((): Promise<PickResult> => {
    const state = useMembersStore.getState();
    const members = kind === 'human' ? state.humans : state.pets;
    const activeId = kind === 'human' ? state.activeHumanId : state.activePetId;
    const active = members.find((m) => m.id === activeId) ?? members[0] ?? null;

    if (members.length === 0) {
      return Promise.resolve({ id: null, prompted: false });
    }
    if (members.length < 2) {
      return Promise.resolve({ id: active?.id ?? null, prompted: false });
    }
    return new Promise<PickResult>((resolve) => {
      resolverRef.current = resolve;
      setVisible(true);
    });
  }, [kind]);

  const onPick = useCallback((id: string) => {
    setVisible(false);
    resolverRef.current?.({ id, prompted: true });
    resolverRef.current = null;
  }, []);

  const onClose = useCallback(() => {
    setVisible(false);
    resolverRef.current?.({ id: null, prompted: true });
    resolverRef.current = null;
  }, []);

  return {
    pickMember,
    modalProps: {
      visible,
      kind,
      onPick,
      onClose,
    },
  };
}
