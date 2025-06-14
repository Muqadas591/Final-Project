import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';


const IconComponent = ({ name, size = 20, color = "#FEF9D9", style }) => {
  return <Icon name={name} size={size} color={color} style={style} />;
};

export default IconComponent;
