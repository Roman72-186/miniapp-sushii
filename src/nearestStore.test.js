const {
  findNearestStore,
  findAllSorted,
  findActiveStoreById,
  findStoreForDelivery,
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

// Ключевая улица (Ленинградский р-н Калининграда) геометрически ближе к точке
// «Гурьевск», чем городские точки, но Гурьевск обслуживает только сам Гурьевск.
const kluchevayaAddress = 'Россия, Калининградская область, Калининград, Ленинградский район, Ключевая улица, 27В';
const kluchevayaLat = 54.7496;
const kluchevayaLon = 20.5488;

test('городской адрес, геометрически ближайший к Гурьевску, уходит в городскую точку', () => {
  const nearest = findStoreForDelivery(
    'Ключевая, 27В',
    kluchevayaLat,
    kluchevayaLon,
    undefined,
    kluchevayaAddress
  );

  expect(nearest.id).toBe(1);
  expect(nearest.affiliate).toBe('184');
});

test('адрес в самом Гурьевске по-прежнему уходит в точку Гурьевска', () => {
  const gurievskAddress = 'Россия, Калининградская область, городской посёлок Гурьевск, Ключевая улица, 1';

  const nearest = findStoreForDelivery(
    'Ключевая, 1',
    kluchevayaLat,
    kluchevayaLon,
    undefined,
    gurievskAddress
  );

  expect(nearest.id).toBe(4);
  expect(nearest.affiliate).toBe('396');
});
