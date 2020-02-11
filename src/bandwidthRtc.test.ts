import BandwidthRtc from './bandwidthRtc';
import { RtcAuthParams, RtcOptions } from './types';

test('sdk version', () => {
    const bandwidthRtc = new BandwidthRtc();
    expect(bandwidthRtc.sdkVersion).toBe('1.0.1');
});

test('connect method with minimum required inputs', () => {
    const bandwidthRtc = new BandwidthRtc();
    bandwidthRtc._connect = jest.fn();
    bandwidthRtc.connect({
        accountId: 'youraccountnumber',
        username: 'yourdashboardusername',
        password: 'yourdashboardpassword'
    });
    expect(bandwidthRtc._connect.mock.calls.length).toBe(1);
    expect(bandwidthRtc._connect.mock.calls[0][0]).toStrictEqual({
        accountId: 'youraccountnumber',
        username: 'yourdashboardusername',
        password: 'yourdashboardpassword'
    });
    expect(bandwidthRtc._connect.mock.calls[0][1]).toStrictEqual({
        websocketUrl: 'wss://server.webrtc.bandwidth.com',
        sipDestination: '+19192892727'
    });
});

test('connect method with maximum allowed inputs', () => {
    const bandwidthRtc = new BandwidthRtc();
    bandwidthRtc._connect = jest.fn();
    bandwidthRtc.connect({
        accountId: 'youraccountnumber',
        username: 'yourdashboardusername',
        password: 'yourdashboardpassword'
    }, {
        websocketUrl: 'wss://some.other.url.bandwidth.com',
        sipDestination: 'someothersiptarget'
    });
    expect(bandwidthRtc._connect.mock.calls.length).toBe(1);
    expect(bandwidthRtc._connect.mock.calls[0][0]).toStrictEqual({
        accountId: 'youraccountnumber',
        username: 'yourdashboardusername',
        password: 'yourdashboardpassword'
    });
    expect(bandwidthRtc._connect.mock.calls[0][1]).toStrictEqual({
        websocketUrl: 'wss://some.other.url.bandwidth.com',
        sipDestination: 'someothersiptarget'
    });
});