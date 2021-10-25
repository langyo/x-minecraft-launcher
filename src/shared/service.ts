/* eslint-disable no-dupe-class-members */
import { GenericEventEmitter } from './events'
import { ServiceKey, ServiceTemplate } from './services/Service'

export interface ServiceCallTaskListener {
  /**
   * This will be called if a task is generated by the service call.
   *
   * @param serviceKey The service name
   * @param method The service method name
   * @param serviceCallPromise The promise result of that service call
   * @param serviceCallId The service call id
   * @param taskId The task id which is newly generated by the task
   */
  (serviceKey: ServiceKey<any>, method: string, serviceCallPromise: Promise<any>, serviceCallId: number, taskId: string): void
}

interface ServiceChannelEventMap {
  commit: {
    mutation: { payload: any; type: string }
    id: number
  }
}

export type ProxyOfServcie<T> = Omit<T, 'state'> & {
  // TODO: implement the single service sync here
}

export interface ServiceChannel extends GenericEventEmitter<ServiceChannelEventMap> {
  sync(id?: number): Promise<{ state: any; length: number }>
  commit(key: string, payload: any): void

  /**
   * Create a statelss proxy object for a specific service.
   * 
   * Notice you need to wrap this object to create a full stateful service!
   * This design is due the the limitation of context isolation. The state object will lose reactivity if you are using vue.
   * 
   * @param serviceKey The service key
   */
  createServiceProxy<T>(serviceKey: ServiceKey<T>, template: ServiceTemplate<T>, onTaskCreated?: ServiceCallTaskListener): ProxyOfServcie<T>
}
