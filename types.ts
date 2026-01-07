
export interface PricePoint {
  date: string;
  price: number;
}

export enum MovementType {
  UP = 'UP',
  DOWN = 'DOWN'
}

export interface MovementEvent {
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  type: MovementType;
  percentageChange: number;
  daysTaken: number;
  context?: string; // New field for macro/micro events
}

export interface AnalysisResult {
  ticker: string;
  year: number;
  targetPercentage: number;
  data: PricePoint[];
  movements: MovementEvent[];
}
