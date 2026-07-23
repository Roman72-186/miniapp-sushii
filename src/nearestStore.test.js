const {
  findNearestStore,
  findAllSorted,
  findActiveStoreById,
} = require('../api/_lib/nearest-store');

const statesWithAutomobilnayaDisabled = {
  points: {
    '1': true,
    '2': true,
    '3': false,
    '4': true,
  },
};

test('выбирает следующую ближайшую точку, если ближайшая отключена', () => {
  const nearest = findNearestStore(
    54.6890,
    20.5150,
    statesWithAutomobilnayaDisabled
  );

  expect(nearest.id).toBe(1);
  expect(nearest.affiliate).toBe('184');
});

test('не возвращает отключённую точку в списке ближайших', () => {
  const sorted = findAllSorted(
    54.6890,
    20.5150,
    statesWithAutomobilnayaDisabled
  );

  expect(sorted.map(store => store.id)).toEqual([1, 2, 4]);
  expect(findActiveStoreById(3, statesWithAutomobilnayaDisabled)).toBeNull();
});
