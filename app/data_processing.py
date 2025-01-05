import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

def zero_fill_and_aggregate(df, program_col, state_col, unique_id_col):
    logger.info("Starting zero_fill_and_aggregate function")
    try:
        # Build an hourly range
        start_date = df["timestamp"].min().floor("h")
        end_date = df["timestamp"].max().floor("h")
        logger.info(f"Date range: {start_date} to {end_date}")
        
        full_hours = pd.date_range(start=start_date, end=end_date, freq="h")

        # Group by hour, partner, state
        logger.info("Aggregating data by hour, partner, and state")
        df_agg_tmp = (
            df.groupby([
                pd.Grouper(key="timestamp", freq="h"),
                program_col,
                state_col
            ])[unique_id_col]
            .count()
            .reset_index(name="contact_count")
            .sort_values("timestamp")
        )

        # Build a full multi-index
        all_programs = df[program_col].unique()
        all_states = df[state_col].unique()
        logger.info(f"Number of unique programs: {len(all_programs)}")
        logger.info(f"Number of unique states: {len(all_states)}")
        
        full_index = pd.MultiIndex.from_product(
            [full_hours, all_programs, all_states],
            names=["timestamp", program_col, state_col]
        )

        df_agg_tmp = df_agg_tmp.set_index(["timestamp", program_col, state_col])
        df_agg_tmp = df_agg_tmp.reindex(full_index, fill_value=0).reset_index()

        # Aggregated time series
        logger.info("Calculating total contacts")
        df_total_tmp = (
            df_agg_tmp.groupby("timestamp")["contact_count"]
            .sum()
            .reset_index(name="total_contacts")
            .sort_values("timestamp")
        )

        return df_agg_tmp, df_total_tmp
    except Exception as e:
        logger.error(f"Error in zero_fill_and_aggregate: {str(e)}")
        raise