import { Request, Response, NextFunction } from "express";
import MarketPrice, {
  IMarketPrice,
  MarketType,
  PriceType,
} from "../models/MarketPrice";
import { FilterQuery } from "mongoose";

export const createMarketPrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    for (let i = 0; i < payload.length; i += 1) {
      const {
        crop_name,
        market_location,
        price,
        recorded_date,
        price_type,
        market_type,
        state,
      } = payload[i];

      if (
        !crop_name ||
        !market_location ||
        price === undefined ||
        !recorded_date ||
        !price_type ||
        !market_type ||
        !state
      ) {
        res.status(400).json({
          success: false,
          message: `Missing required fields in entry ${i + 1}`,
        });
        return;
      }

      const parsedDate = new Date(recorded_date);
      if (Number.isNaN(parsedDate.getTime())) {
        res.status(400).json({
          success: false,
          message: `Invalid recorded_date in entry ${i + 1}`,
        });
        return;
      }

      if (!Object.values(PriceType).includes(price_type)) {
        res.status(400).json({
          success: false,
          message: `Invalid price_type in entry ${i + 1}`,
        });
        return;
      }

      if (!Object.values(MarketType).includes(market_type)) {
        res.status(400).json({
          success: false,
          message: `Invalid market_type in entry ${i + 1}`,
        });
        return;
      }

      if (typeof price !== "number" || price < 0) {
        res.status(400).json({
          success: false,
          message: `Invalid price in entry ${i + 1}`,
        });
        return;
      }
    }

    const createdPrices = await MarketPrice.create(
      payload.map(
        ({
          crop_name,
          market_location,
          price,
          recorded_date,
          price_type,
          market_type,
          state,
        }) => ({
          crop_name,
          market_location,
          price,
          recorded_date: new Date(recorded_date),
          price_type,
          market_type,
          state,
        }),
      ),
    );

    res.status(201).json({
      success: true,
      data: Array.isArray(req.body) ? createdPrices : createdPrices[0],
      count: createdPrices.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getMarketPrices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      crop_name,
      market_location,
      state,
      price_type,
      market_type,
      from,
      to,
      page = "1",
      limit = "20",
    } = req.query;

    const filter: FilterQuery<IMarketPrice> = {};
    if (crop_name) {
      filter.crop_name = crop_name as string;
    }
    if (market_location) {
      filter.market_location = market_location as string;
    }
    if (state) {
      filter.state = state as string;
    }
    if (price_type) {
      filter.price_type = price_type as PriceType;
    }
    if (market_type) {
      filter.market_type = market_type as MarketType;
    }

    if (from || to) {
      filter.recorded_date = {};
      if (from) {
        filter.recorded_date.$gte = new Date(from as string);
      }
      if (to) {
        filter.recorded_date.$lte = new Date(to as string);
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [prices, total] = await Promise.all([
      MarketPrice.find(filter)
        .sort({ recorded_date: -1 })
        .skip(skip)
        .limit(limitNum),
      MarketPrice.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: prices,
      count: prices.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getMarketPriceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const price = await MarketPrice.findOne({ id });

    if (!price) {
      res.status(404).json({
        success: false,
        message: "Market price not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: price,
    });
  } catch (error) {
    next(error);
  }
};

export const getLatestPrices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { crop_name, state } = req.query;

    const matchFilter: FilterQuery<IMarketPrice> = {};
    if (crop_name) {
      matchFilter.crop_name = crop_name as string;
    }
    if (state) {
      matchFilter.state = state as string;
    }

    const latestPrices = await MarketPrice.aggregate([
      { $match: matchFilter },
      { $sort: { recorded_date: -1 } },
      {
        $group: {
          _id: {
            crop_name: "$crop_name",
            market_location: "$market_location",
          },
          latestPrice: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latestPrice" } },
      { $sort: { crop_name: 1, market_location: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: latestPrices,
      count: latestPrices.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getPriceTrends = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { crop_name, market_location, from, to } = req.query;

    if (!crop_name) {
      res.status(400).json({
        success: false,
        message: "crop_name is required for price trends",
      });
      return;
    }

    const filter: FilterQuery<IMarketPrice> = {
      crop_name: crop_name as string,
    };
    if (market_location) {
      filter.market_location = market_location as string;
    }

    if (from || to) {
      filter.recorded_date = {};
      if (from) {
        filter.recorded_date.$gte = new Date(from as string);
      }
      if (to) {
        filter.recorded_date.$lte = new Date(to as string);
      }
    }

    const trends = await MarketPrice.aggregate([
      { $match: filter },
      { $sort: { recorded_date: 1 } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$recorded_date" },
          },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: trends,
      count: trends.length,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMarketPrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { price, recorded_date } = req.body;

    const marketPrice = await MarketPrice.findOne({ id });
    if (!marketPrice) {
      res.status(404).json({
        success: false,
        message: "Market price not found",
      });
      return;
    }

    const updateData: Partial<IMarketPrice> = {};
    if (price !== undefined) updateData.price = price;
    if (recorded_date) updateData.recorded_date = new Date(recorded_date);

    const updatedPrice = await MarketPrice.findOneAndUpdate(
      { id },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: updatedPrice,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMarketPrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const marketPrice = await MarketPrice.findOne({ id });
    if (!marketPrice) {
      res.status(404).json({
        success: false,
        message: "Market price not found",
      });
      return;
    }

    await MarketPrice.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Market price deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
