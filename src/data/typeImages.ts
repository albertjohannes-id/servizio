import { ImageSourcePropType } from 'react-native';
import { AssetType } from '../domain/types';

export const TYPE_IMAGES: Record<AssetType, ImageSourcePropType> = {
  car: require('../../assets/types/type-car.png'),
  motorcycle: require('../../assets/types/type-motorcycle.png'),
  bike: require('../../assets/types/type-bike.png'),
  ac: require('../../assets/types/type-ac.png'),
  water_heater: require('../../assets/types/type-water-heater.png'),
  other: require('../../assets/types/type-other.png'),
};
