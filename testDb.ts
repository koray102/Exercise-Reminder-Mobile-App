import * as SQLite from 'expo-sqlite';

export async function testDb() {
  try {
    console.log("Opening db...");
    const db = await SQLite.openDatabaseAsync('test.db');
    console.log("Creating table...");
    await db.execAsync('CREATE TABLE IF NOT EXISTS test (id TEXT, num INTEGER)');
    
    console.log("Testing insert with array...");
    try {
      await db.runAsync('INSERT INTO test (id, num) VALUES (?, ?)', ['a', 1]);
      console.log("Array param worked!");
    } catch (e) {
      console.log("Array param failed:", e);
    }

    console.log("Testing insert with rest...");
    try {
      await db.runAsync('INSERT INTO test (id, num) VALUES (?, ?)', 'b', 2);
      console.log("Rest param worked!");
    } catch (e) {
      console.log("Rest param failed:", e);
    }
    
    console.log("Testing select without params...");
    try {
      const res = await db.getAllAsync('SELECT * FROM test');
      console.log("Select without params worked! count:", res.length);
    } catch (e) {
      console.log("Select without params failed:", e);
    }

    console.log("Testing select with rest param...");
    try {
      const res = await db.getAllAsync('SELECT * FROM test WHERE id = ?', 'a');
      console.log("Select with rest worked! count:", res.length);
    } catch (e) {
      console.log("Select with rest failed:", e);
    }

    console.log("Testing select with array param...");
    try {
      const res = await db.getAllAsync('SELECT * FROM test WHERE id = ?', ['b']);
      console.log("Select with array worked! count:", res.length);
    } catch (e) {
      console.log("Select with array failed:", e);
    }
  } catch (e) {
    console.error("Fatal db error:", e);
  }
}
