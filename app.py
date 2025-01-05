from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from prophet import Prophet
import io
import xlsxwriter
import os
import logging
import sys
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health')
def health_check():
    logger.info("Health check endpoint called")
    return 'Python service is running'

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
        logger.error(traceback.format_exc())
        raise

def run_prophet_forecast(df_total, forecast_days=7):
    logger.info("Starting Prophet forecast")
    try:
        df_prophet = df_total.rename(columns={"timestamp": "ds", "total_contacts": "y"})

        # Clip outliers
        upper_threshold = df_prophet["y"].quantile(0.99)
        logger.info(f"Upper threshold for outliers: {upper_threshold}")
        df_prophet["y"] = np.where(df_prophet["y"] > upper_threshold, upper_threshold, df_prophet["y"])

        # Model selection based on data coverage
        num_days = (df_prophet["ds"].max() - df_prophet["ds"].min()).days
        logger.info(f"Data coverage: {num_days} days")
        
        use_yearly = num_days > 180
        use_monthly = num_days > 60
        use_weekly = num_days > 14
        use_daily = True

        logger.info(f"Using seasonality: yearly={use_yearly}, monthly={use_monthly}, weekly={use_weekly}, daily={use_daily}")

        model = Prophet(
            yearly_seasonality=use_yearly,
            weekly_seasonality=use_weekly,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10
        )

        if use_monthly:
            model.add_seasonality(name="monthly", period=30.4, fourier_order=5)
        if use_daily:
            model.add_seasonality(name="daily", period=1, fourier_order=10)

        logger.info("Fitting Prophet model")
        model.fit(df_prophet)

        # Forecast for the next forecast_days
        logger.info(f"Generating forecast for next {forecast_days} days")
        future = model.make_future_dataframe(periods=forecast_days * 24, freq="h")
        forecast = model.predict(future)

        return model, forecast
    except Exception as e:
        logger.error(f"Error in run_prophet_forecast: {str(e)}")
        logger.error(traceback.format_exc())
        raise

@app.route("/process", methods=["POST"])
def process_file():
    logger.info("Starting file processing endpoint")
    try:
        data = request.json
        logger.info("Request received with data")
        
        file_content = data.get("fileContent")
        if not file_content:
            logger.error("No file content provided")
            return jsonify({"error": "No file content provided"}), 400

        # Read CSV content into pandas DataFrame
        logger.info("Reading CSV content")
        df = pd.read_csv(io.StringIO(file_content))
        logger.info(f"DataFrame shape: {df.shape}")

        # Adjust column names as per your logic
        datetime_col = "Fact Consult Consult Created Time"
        program_col = "Fact Partner Partner Name"
        state_col = "Fact Consult Consult State"
        unique_id_col = "Fact Consult Consult Guid"

        logger.info("Processing timestamps")
        df["timestamp"] = pd.to_datetime(df[datetime_col], errors="coerce")
        df = df.dropna(subset=["timestamp"])
        df = df.sort_values("timestamp").reset_index(drop=True)
        logger.info(f"Processed DataFrame shape: {df.shape}")

        logger.info("Aggregating data")
        df_agg, df_total = zero_fill_and_aggregate(df, program_col, state_col, unique_id_col)

        logger.info("Running forecast")
        model, forecast = run_prophet_forecast(df_total)

        # Create Excel for download
        logger.info("Creating Excel file")
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            df_total.to_excel(writer, sheet_name="Aggregated Data", index=False)
            forecast.to_excel(writer, sheet_name="Forecast", index=False)

        output.seek(0)

        # Format the next seven days forecast
        logger.info("Formatting response")
        next_seven_days = []
        for i in range(7):
            forecast_date = forecast.iloc[-7 + i]
            next_seven_days.append({
                "date": forecast_date["ds"].strftime("%Y-%m-%d"),
                "predicted": round(float(forecast_date["yhat"]), 2)
            })

        response_data = {
            "data": {
                "overview": {
                    "minDate": df["timestamp"].min().strftime("%Y-%m-%d"),
                    "maxDate": df["timestamp"].max().strftime("%Y-%m-%d"),
                    "dataCoverageDays": (df["timestamp"].max() - df["timestamp"].min()).days,
                    "totalRows": len(df),
                    "partners": df[program_col].unique().tolist()
                },
                "forecast": {
                    "nextSevenDays": next_seven_days
                }
            }
        }
        
        logger.info("Processing completed successfully")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": str(e),
            "stack_trace": traceback.format_exc()
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)