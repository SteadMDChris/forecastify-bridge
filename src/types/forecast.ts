export interface Overview {
  minDate: string;
  maxDate: string;
  dataCoverageDays: number;
  totalRows: number;
  partners: string[];
}

export interface ForecastDay {
  date: string;
  predicted: number;
}

export interface Forecast {
  nextSevenDays: ForecastDay[];
}

export interface ModelResults {
  overview: Overview;
  forecast: Forecast;
}

export interface ModelResultsRow {
  id: string;
  user_id: string | null;
  input_file_path: string;
  results: ModelResults;
  status: 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
}