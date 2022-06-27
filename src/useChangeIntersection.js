import {usePrevious} from "./helpers";

import {useMemo} from "react";
export const VERSION = Symbol('ver')

export const STAY = 'STAY', APPEAR = 'APPEAR', DISAPPEAR = 'DISAPPEAR', SWAP = 'SWAP';

export function keyGenerator(item, i) {
    let key = wmKeys.get(item)
    if (key) return key;
    // todo: make it work like a counter instead of random
    const str = 'abcdefghijklmnop1234567890'
    const {random, floor} = Math;
    key = Array.from({length: 4}, (i) => str[floor(random() * str.length)]).join('');
    return key;
}

export function useChangeIntersection(tracking, options = {}, postProcessing) {
    if (!tracking) tracking = [];
    // if(!tracking) throw new Error('tracking is required');
    let {key, withRemoved = true, exportHash} = options;
    key = key ?? options /*options consider as string*/;
    const current = [tracking].flat(1) // convert tracking to array
    const [before, ver] = usePrevious(current, [], [tracking]);

    // if key not provided, use the keyValue at that position as key
    const getKey = (_ => {
        if (typeof key === 'function') return key // key(item,i);
        if (key === 'index') return (item, i) => i;
        if (key === 'generate') return keyGenerator // (item,i);
        if (typeof key === 'string') return (item, i) => item[key]
        return (item, i) => item;
    })();

    return useMemo(_ => {
        const hashMap = new Map()
        const intersection = []
        intersection[VERSION] = ver;
        // register current items and assume they ADD
        for (let [i, item] of current.entries()) {
            let k = getKey(item, i);
            let state = {item, key: k, phase: APPEAR, from: i, to: i}
            hashMap.set(k, state)
            intersection.push(state)
        }
        // register previous items,compare location to understand if they Removed,Static, Move
        for (let [beforeIndex, item] of before.entries()) {
            let k = getKey(item, beforeIndex);
            let state = hashMap.get(k);
            let phase = state ? (beforeIndex === state.to) ? STAY : SWAP : DISAPPEAR;

            if (phase === DISAPPEAR) {
                if (!withRemoved) continue
                state = {item, key: k, phase, from: beforeIndex, to: beforeIndex,}
                intersection.splice(beforeIndex, 0, state)
                hashMap.set(k, state)
            } else Object.assign(state, {from: beforeIndex, phase})
        }
        if (exportHash) return [intersection, hashMap]
        /** run postProcessing if it not return something return intersection array */
        return postProcessing?.(intersection) ?? intersection
        // return intersection;

    }, [tracking])
}