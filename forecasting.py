from prophet import Prophet
import numpy as np
import logging

logger = logging.getLogger(__name__)

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
        raise