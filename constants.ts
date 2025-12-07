import * as THREE from 'three';
import { OrnamentType } from './types';

// Palette: Luxury Materials (Gold, Silver, Pearl, Velvet)
export const COLORS = {
  SPACE_DARK: '#050510',
  NEON_BLUE: '#4DEEEA', // Keep for background accents
  ICE_BLUE: '#A0F0FF',
  PURE_WHITE: '#FFFFFF',
  PEARL_CREAM: '#FDFCF5',
  DEEP_GOLD: '#FFD700',
  PALE_GOLD: '#FCE7A4'
};

// Tree Dimensions
export const TREE_CONFIG = {
  HEIGHT: 12,
  RADIUS_BASE: 4.5,
  PARTICLE_COUNT: 15000,
  CHAOS_RADIUS: 30,
};

export const PEARL_CONFIG = {
  STRANDS: 5,
  PEARLS_PER_STRAND: 80,
  SIZE: 0.15,
  COLOR: COLORS.PEARL_CREAM
};

// Ornament Definitions - Shiny Baubles
export const ORNAMENT_TYPES: OrnamentType[] = [
  { 
    // Gold Baubles
    color: COLORS.DEEP_GOLD, 
    weight: 0.05, 
    scale: 0.25,
    geometry: 'sphere',
    emissive: false
  },
  { 
    // Blue Baubles
    color: COLORS.NEON_BLUE, 
    weight: 0.08, 
    scale: 0.2,
    geometry: 'sphere',
    emissive: false
  },
  { 
    // Silver/White Baubles
    color: COLORS.PURE_WHITE, 
    weight: 0.1, 
    scale: 0.15,
    geometry: 'sphere',
    emissive: false
  }
];

export const ORNAMENT_COUNT = 400; 
