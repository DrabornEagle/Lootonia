import React, { memo, useCallback, useMemo } from 'react';
import { StatusBar } from 'react-native';
import SafeScreen from '../components/layout/SafeScreen';
import styles from '../theme/appStyles';
import CardDetailModal from '../features/collection/CardDetailModal';
import MapHomeScreen from '../features/map/MapHomeScreen';
import ModalHost from './ModalHost';
import OnboardingModal from '../features/onboarding/OnboardingModal';

function getCardKey(card) {
  if (!card) return '';
  return card.id || `${card.name}-${card.series}-${card.theme}-${card.rarity}`;
}

function AppShell({
  cardDetail,
  setCardDetail,
  favMap,
  setFavMap,
  homeProps,
  modalProps,
  onboardingProps,
  hasVisibleModal,
}) {
  const cardKey = useMemo(() => getCardKey(cardDetail), [cardDetail]);
  const isFavorite = !!favMap[cardKey];
  const handleToggleFavorite = useCallback(() => {
    if (!cardKey) return;
    setFavMap((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  }, [cardKey, setFavMap]);

  return (
    <SafeScreen style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <CardDetailModal
        visible={!!cardDetail}
        card={cardDetail}
        onClose={() => setCardDetail(null)}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />

      <MapHomeScreen {...homeProps} />
      {hasVisibleModal ? <ModalHost {...modalProps} /> : null}
      {onboardingProps?.visible ? <OnboardingModal {...onboardingProps} /> : null}
    </SafeScreen>
  );
}

function areEqual(prevProps, nextProps) {
  if (prevProps.hasVisibleModal !== nextProps.hasVisibleModal) return false;
  if (prevProps.homeProps !== nextProps.homeProps) return false;

  const prevCardKey = getCardKey(prevProps.cardDetail);
  const nextCardKey = getCardKey(nextProps.cardDetail);
  if (prevCardKey !== nextCardKey) return false;

  const prevFavorite = !!prevProps.favMap?.[prevCardKey];
  const nextFavorite = !!nextProps.favMap?.[nextCardKey];
  if (prevFavorite !== nextFavorite) return false;

  const prevOnboardingVisible = !!prevProps.onboardingProps?.visible;
  const nextOnboardingVisible = !!nextProps.onboardingProps?.visible;
  if (prevOnboardingVisible !== nextOnboardingVisible) return false;
  if ((prevOnboardingVisible || nextOnboardingVisible) && prevProps.onboardingProps !== nextProps.onboardingProps) return false;

  if (nextProps.hasVisibleModal && prevProps.modalProps !== nextProps.modalProps) return false;

  return (
    prevProps.setCardDetail === nextProps.setCardDetail &&
    prevProps.setFavMap === nextProps.setFavMap
  );
}

export default memo(AppShell, areEqual);
