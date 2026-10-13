
import { configureStore, createSlice } from "@reduxjs/toolkit";

const appSlice = createSlice({
  name: "app",
  initialState: {
    ready: true,
  },
  reducers: {},
});

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});
